import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import request from "supertest";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { ProjectSchema } from "../../src/domain/project";
import { createApp } from "../../src/server/app";
import { readConfig } from "../../src/server/config";
import { GenerationService } from "../../src/server/generation/generation-service";
import { SampleProvider } from "../../src/server/storage/sample-provider";
import { ProjectStore } from "../../src/server/storage/project-store";
import {
  deferred,
  makeProjectWithApprovedPanel,
  RecordingProvider,
  validPngBytes,
} from "../fixtures/generation-fixtures";

const fixtureRoot = path.resolve("sample-assets/moon-kite");

async function harness(label: string, withService = true) {
  const root = path.resolve("tmp", `${label}-${randomUUID()}`);
  const store = new ProjectStore(root);
  const bytes = await validPngBytes();
  const provider = new RecordingProvider(bytes);
  const generationService = new GenerationService(store, provider);
  const dependencies = {
    config: readConfig({ DATA_DIR: root }),
    store,
    sampleProvider: new SampleProvider(fixtureRoot, store),
    ...(withService ? { generationService } : {}),
  };
  return { root, store, provider, generationService, app: createApp(dependencies) };
}

async function seed(store: ProjectStore) {
  const project = makeProjectWithApprovedPanel();
  await store.save(project);
  const bytes = await validPngBytes();
  await Promise.all([
    ...project.hero.imageVersions,
    ...project.panels.flatMap((panel) => panel.imageVersions),
  ].map((version) => fs.writeFile(store.assetPath(project.id, version.id), bytes)));
  return project;
}

describe("generation routes", () => {
  it("returns schema-valid whole projects for generation and explicit approval/rejection", async () => {
    const { app, store } = await harness("generation-routes-projects");
    const project = await seed(store);
    const panelId = project.panels[0]!.id;

    const generated = await request(app)
      .post(`/api/projects/${project.id}/panels/${panelId}/generate`)
      .send({ revisionDirection: "Warmer" });
    expect(generated.status).toBe(201);
    expect(ProjectSchema.safeParse(generated.body.project).success).toBe(true);
    const candidateId = generated.body.project.panels[0].imageVersions.at(-1).id;

    const kept = await request(app)
      .post(`/api/projects/${project.id}/panels/${panelId}/versions/${candidateId}/reject`)
      .send({});
    expect(kept.status).toBe(200);
    expect(ProjectSchema.safeParse(kept.body.project).success).toBe(true);
    expect(kept.body.project.panels[0].approvedImageVersionId).toBe("approved-old");

    const heroApproved = await request(app)
      .post(`/api/projects/${project.id}/hero/hero-candidate/approve`)
      .send({});
    expect(heroApproved.status).toBe(200);
    expect(heroApproved.body.heroReferenceChanged).toBe(true);
    expect(ProjectSchema.safeParse(heroApproved.body.project).success).toBe(true);
  });

  it("serves member PNGs without a generation service and rejects unknown or foreign ids", async () => {
    const { app, store } = await harness("generation-routes-offline-images", false);
    const sample = await new SampleProvider(fixtureRoot, store).copyToProject();
    const imageId = sample.panels[0]!.approvedImageVersionId!;

    const image = await request(app).get(`/api/projects/${sample.id}/images/${imageId}`);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toMatch(/^image\/png/);
    expect(image.headers["cache-control"]).toBe("no-store");
    expect(await sharp(image.body).metadata()).toMatchObject({
      format: "png",
      width: 1024,
      height: 1024,
    });

    expect((await request(app).get(`/api/projects/${sample.id}/images/not-a-member`)).status).toBe(404);
    expect((await request(app).get(`/api/projects/${sample.id}/images/${encodeURIComponent("../escape")}`)).status).toBe(404);

    const other = await seed(store);
    const foreign = other.hero.approvedReferenceImageId!;
    expect((await request(app).get(`/api/projects/${sample.id}/images/${foreign}`)).status).toBe(404);
  });

  it("returns missing_key for mutation routes when generation is absent", async () => {
    const { app, store } = await harness("generation-routes-missing-key", false);
    const project = await seed(store);

    const response = await request(app)
      .post(`/api/projects/${project.id}/hero/generate`)
      .send({});

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: "missing_key",
        message: expect.any(String),
        retryable: false,
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/OPENAI_API_KEY|sk-/);
  });

  it("uses strict bounded bodies and product-safe 400/404 responses", async () => {
    const { app, store } = await harness("generation-routes-validation");
    const project = await seed(store);
    const panelId = project.panels[0]!.id;
    const responses = [
      await request(app)
        .post(`/api/projects/${project.id}/panels/${panelId}/generate`)
        .send({ revisionDirection: "x".repeat(501) }),
      await request(app)
        .post(`/api/projects/${project.id}/panels/${panelId}/generate`)
        .send({ revisionDirection: "Night", dialogue: "must be rejected" }),
      await request(app)
        .post(`/api/projects/${project.id}/hero/generate`)
        .send({ unexpected: true }),
    ];
    for (const response of responses) {
      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({ code: "storage", retryable: false });
      expect(JSON.stringify(response.body)).not.toMatch(/zod|stack|secret|internal/i);
    }

    expect((await request(app)
      .post(`/api/projects/${project.id}/panels/unknown/generate`)
      .send({ revisionDirection: "" })).status).toBe(404);
    expect((await request(app)
      .post(`/api/projects/${project.id}/panels/${panelId}/versions/unknown/approve`)
      .send({})).status).toBe(404);
  });

  it("returns 429 for simultaneous generation and releases the route lock", async () => {
    const gate = deferred<void>();
    const root = path.resolve("tmp", `generation-routes-busy-${randomUUID()}`);
    const store = new ProjectStore(root);
    const provider = new RecordingProvider(await validPngBytes(), gate);
    const service = new GenerationService(store, provider);
    const app = createApp({
      config: readConfig({ DATA_DIR: root }),
      store,
      sampleProvider: new SampleProvider(fixtureRoot, store),
      generationService: service,
    });
    const project = await seed(store);

    const first = request(app)
      .post(`/api/projects/${project.id}/panels/${project.panels[0]!.id}/generate`)
      .send({ revisionDirection: "Closer" });
    const firstPromise = first.then((response) => response);
    await vi.waitFor(() => expect(provider.panelPrompts).toHaveLength(1));
    const busy = await request(app)
      .post(`/api/projects/${project.id}/hero/generate`)
      .send({});
    expect(busy.status).toBe(429);
    expect(busy.body.error).toMatchObject({ code: "rate_limit", retryable: true });
    gate.resolve();
    expect((await firstPromise).status).toBe(201);
    expect((await request(app)
      .post(`/api/projects/${project.id}/hero/generate`)
      .send({})).status).toBe(201);
  });
});
