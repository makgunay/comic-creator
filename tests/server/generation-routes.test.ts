import fs from "node:fs/promises";
import path from "node:path";
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
import { testTmpPath } from "../support/tmp-lifecycle";

const fixtureRoot = path.resolve("sample-assets/moon-kite");

async function harness(label: string, withService = true) {
  const root = testTmpPath(label);
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
  it("returns a signal-only coach response without mutating the project", async () => {
    const { app, store, provider } = await harness("generation-routes-coach");
    const project = await seed(store);
    project.beats.forEach((beat, index) => {
      beat.childText = `Story beat ${index + 1}`;
    });
    await store.save(project);
    const before = await store.load(project.id);

    const response = await request(app)
      .post(`/api/projects/${project.id}/coach`)
      .send({ previousSignal: "setup_needs_setting" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ signal: "big_moment_needs_choice" });
    expect(provider.coachInputs[0]).toMatchObject({
      previousSignal: "setup_needs_setting",
    });
    expect(await store.load(project.id)).toEqual(before);
  });

  it("returns schema-valid whole projects for generation and explicit approval/rejection", async () => {
    const { app, store } = await harness("generation-routes-projects");
    const project = await seed(store);
    const panelId = project.panels[0]!.id;
    project.panels[0]!.overlays = [{
      id: "route-dialogue",
      kind: "dialogue",
      text: "Exact route words",
      x: .1,
      y: .1,
      width: .4,
      height: .2,
    }];
    await store.save(project);

    const generated = await request(app)
      .post(`/api/projects/${project.id}/panels/${panelId}/generate`)
      .send({ revisionDirection: "Warmer", embeddedLettering: true });
    expect(generated.status).toBe(201);
    expect(ProjectSchema.safeParse(generated.body.project).success).toBe(true);
    expect(generated.body.project.panels[0].imageVersions.at(-1).letteringMode).toBe("embedded");
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
    expect((await request(app).get(`/api/projects/${sample.id}/images/${encodeURIComponent("../escape")}`)).status).toBe(400);

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

    const coach = await request(app)
      .post(`/api/projects/${project.id}/coach`)
      .send({});
    expect(coach.status).toBe(503);
    expect(coach.body.error.code).toBe("missing_key");
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
        .post(`/api/projects/${project.id}/panels/${panelId}/generate`)
        .send({ revisionDirection: "Night", embeddedLettering: "yes" }),
      await request(app)
        .post(`/api/projects/${project.id}/hero/generate`)
        .send({ unexpected: true }),
      await request(app)
        .post(`/api/projects/${project.id}/coach`)
        .send({ question: "Write my story" }),
      await request(app)
        .post(`/api/projects/${project.id}/coach`)
        .send({ previousSignal: "invent_a_dragon" }),
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

  it("returns distinct nonretryable codes for malformed route identifiers", async () => {
    const { app, store } = await harness("generation-routes-invalid-ids");
    const project = await seed(store);
    const panelId = project.panels[0]!.id;
    const cases = [
      {
        path: `/api/projects/bad_project/panels/${panelId}/generate`,
        body: { revisionDirection: "" },
        code: "invalid_project_id",
      },
      {
        path: `/api/projects/${project.id}/panels/bad_panel/generate`,
        body: { revisionDirection: "" },
        code: "invalid_panel_id",
      },
      {
        path: `/api/projects/${project.id}/panels/${panelId}/versions/bad_version/approve`,
        body: {},
        code: "invalid_version_id",
      },
      {
        path: `/api/projects/${project.id}/hero/bad_image/approve`,
        body: {},
        code: "invalid_image_id",
      },
    ];

    for (const testCase of cases) {
      const response = await request(app).post(testCase.path).send(testCase.body);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: testCase.code,
          message: expect.any(String),
          retryable: false,
        },
      });
      expect(JSON.stringify(response.body)).not.toMatch(
        /bad_|path|stack|secret|internal/i,
      );
    }
  });

  it.each(["malformed", "missing", "non-square", "symlink"] as const)(
    "returns a recoverable 409 and failed-retryable state for %s approved hero artwork",
    async (failure) => {
      const { app, store } = await harness(`generation-routes-reference-${failure}`);
      const project = await seed(store);
      const panelId = project.panels[0]!.id;
      const referenceId = project.hero.approvedReferenceImageId!;
      const referencePath = store.assetPath(project.id, referenceId);
      if (failure === "malformed") {
        await fs.writeFile(referencePath, "not a png");
      } else if (failure === "missing") {
        await fs.rename(referencePath, `${referencePath}.missing`);
      } else if (failure === "non-square") {
        await sharp({
          create: {
            width: 1024,
            height: 512,
            channels: 4,
            background: "#6f51d8",
          },
        }).png().toFile(referencePath);
      } else {
        const target = `${referencePath}.target`;
        await fs.rename(referencePath, target);
        await fs.symlink(target, referencePath);
      }

      const response = await request(app)
        .post(`/api/projects/${project.id}/panels/${panelId}/generate`)
        .send({ revisionDirection: "" });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: {
          code: "provider",
          message: expect.any(String),
          retryable: true,
        },
      });
      expect(JSON.stringify(response.body)).not.toMatch(
        /enoent|png|symlink|path|stack|secret|internal/i,
      );
      expect((await store.load(project.id)).panels[0]!.generationStatus)
        .toBe("failed-retryable");
    },
  );

  it("returns 429 for simultaneous generation and releases the route lock", async () => {
    const gate = deferred<void>();
    const root = testTmpPath("generation-routes-busy");
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
