import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import request from "supertest";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectSchema } from "../../src/domain/project";
import { createApp } from "../../src/server/app";
import { readConfig } from "../../src/server/config";
import { SampleProvider } from "../../src/server/storage/sample-provider";
import { ProjectStore } from "../../src/server/storage/project-store";
import { makeProject } from "../fixtures/project-fixtures";

const fixtureRoot = path.resolve("sample-assets/moon-kite");
const overlayText = [
  "Tonight, I’ll touch the moon!",
  "Oh no—the wind has other plans!",
  "Hold on, little kite!",
  "We made our own moonlight.",
] as const;

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function testDependencies(label: string, withKey = false) {
  const root = path.resolve("tmp", `${label}-${randomUUID()}`);
  const store = new ProjectStore(root);
  return {
    root,
    store,
    dependencies: {
      config: readConfig({
        DATA_DIR: root,
        ...(withKey ? { OPENAI_API_KEY: "test-key" } : {}),
      }),
      store,
      sampleProvider: new SampleProvider(fixtureRoot, store),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("project routes", () => {
  it("uses four deterministic 1024 by 1024 PNG sample fixtures", async () => {
    const metadata = await Promise.all(
      [1, 2, 3, 4].map((index) =>
        sharp(path.join(fixtureRoot, "images", `panel-${index}.png`)).metadata(),
      ),
    );

    expect(metadata.map((image) => ({
      format: image.format,
      width: image.width,
      height: image.height,
    }))).toEqual(Array.from({ length: 4 }, () => ({
      format: "png",
      width: 1024,
      height: 1024,
    })));
  });

  it("creates, loads, and updates a local project through an injected app", async () => {
    const { dependencies } = testDependencies("project-routes-crud");
    const app = createApp(dependencies);

    const created = await request(app)
      .post("/api/projects")
      .send({ title: "A New Comic", localAuthorCredit: "N." });
    expect(created.status).toBe(201);
    expect(ProjectSchema.safeParse(created.body).success).toBe(true);

    const loaded = await request(app).get(`/api/projects/${created.body.id}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body).toEqual(created.body);

    const updated = await request(app)
      .put(`/api/projects/${created.body.id}`)
      .send({ ...created.body, title: "A Better Title" });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("A Better Title");
    expect(Date.parse(updated.body.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(created.body.updatedAt),
    );
  });

  it("reports public generation capability without exposing configuration secrets", async () => {
    const disabled = await request(createApp(testDependencies("config-disabled").dependencies))
      .get("/api/config");
    const enabled = await request(createApp(testDependencies("config-enabled", true).dependencies))
      .get("/api/config");

    expect(disabled.status).toBe(200);
    expect(disabled.body).toEqual({ generationEnabled: false });
    expect(enabled.body).toEqual({ generationEnabled: true });
    expect(JSON.stringify(enabled.body)).not.toContain("test-key");
  });

  it("returns product-safe errors for invalid input, mismatched ids, and missing projects", async () => {
    const { dependencies } = testDependencies("project-routes-errors");
    const app = createApp(dependencies);
    const project = makeProject();

    const invalid = await request(app)
      .post("/api/projects")
      .send({ title: "", localAuthorCredit: "N." });
    const mismatch = await request(app)
      .put("/api/projects/different-id")
      .send(project);
    const missing = await request(app).get("/api/projects/missing-project");
    const unsafe = await request(app).get("/api/projects/project_name");

    expect(invalid.status).toBe(400);
    expect(mismatch.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(unsafe.status).toBe(400);
    for (const response of [invalid, mismatch, missing, unsafe]) {
      expect(response.body).toEqual({
        error: {
          code: "storage",
          message: expect.any(String),
          retryable: false,
        },
      });
    }
  });

  it("copies the exact sample without a key, provider call, or fixture mutation", async () => {
    const { store, dependencies } = testDependencies("sample-route");
    const networkCall = vi.fn(() => {
      throw new Error("Sample mode attempted a paid or live provider request");
    });
    vi.stubGlobal("fetch", networkCall);
    const fixtureDocumentBefore = await fs.readFile(
      path.join(fixtureRoot, "project.json"),
    );
    const fixtureImagesBefore = await Promise.all(
      [1, 2, 3, 4].map((index) =>
        fs.readFile(path.join(fixtureRoot, "images", `panel-${index}.png`)),
      ),
    );

    const response = await request(createApp(dependencies)).post("/api/projects/sample");

    expect(response.status).toBe(201);
    const project = ProjectSchema.parse(response.body);
    expect(project.id).not.toBe("sample-moon-kite");
    expect(project.title).toBe("Nova and the Moon Kite");
    expect(project.panels).toHaveLength(4);
    expect(project.panels.map((panel) => panel.overlays[0]?.text)).toEqual(overlayText);
    expect(
      project.panels.flatMap((panel) =>
        panel.imageVersions.map((version) => version.localPath),
      ),
    ).toEqual([
      "images/sample-art-1.png",
      "images/sample-art-2.png",
      "images/sample-art-3.png",
      "images/sample-art-4.png",
    ]);
    expect(networkCall).not.toHaveBeenCalled();

    for (const [index, panel] of project.panels.entries()) {
      const version = panel.imageVersions[0]!;
      expect(digest(await fs.readFile(store.assetPath(project.id, version.id)))).toBe(
        digest(fixtureImagesBefore[index]!),
      );
    }
    expect(digest(await fs.readFile(path.join(fixtureRoot, "project.json")))).toBe(
      digest(fixtureDocumentBefore),
    );
    await Promise.all(
      fixtureImagesBefore.map(async (before, index) => {
        expect(digest(
          await fs.readFile(path.join(fixtureRoot, "images", `panel-${index + 1}.png`)),
        )).toBe(digest(before));
      }),
    );
  });

  it("creates independent writable sample copies from one deterministic fixture", async () => {
    const { store } = testDependencies("sample-provider-copies");
    const provider = new SampleProvider(fixtureRoot, store);

    const first = await provider.copyToProject();
    const second = await provider.copyToProject();

    expect(first.id).not.toBe(second.id);
    expect(first.panels.map((panel) => panel.id)).toEqual(
      second.panels.map((panel) => panel.id),
    );
    first.panels[0]!.overlays[0]!.text = "Changed only in memory";
    expect((await store.load(second.id)).panels[0]!.overlays[0]!.text).toBe(
      overlayText[0],
    );
    const fixture = ProjectSchema.parse(
      JSON.parse(await fs.readFile(path.join(fixtureRoot, "project.json"), "utf8")),
    );
    expect(fixture.id).toBe("sample-moon-kite");
    expect(fixture.panels.map((panel) => panel.overlays[0]?.text)).toEqual(overlayText);
  });
});
