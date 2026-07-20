import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import request from "supertest";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app";
import { readConfig } from "../../src/server/config";
import { SampleProvider } from "../../src/server/storage/sample-provider";
import { ProjectStore } from "../../src/server/storage/project-store";
import { testTmpPath } from "../support/tmp-lifecycle";

const fixtureRoot = path.resolve("sample-assets/moon-kite");

function harness(label: string) {
  const root = testTmpPath(label);
  const store = new ProjectStore(root);
  return {
    store,
    app: createApp({
      config: readConfig({ DATA_DIR: root }),
      store,
      sampleProvider: new SampleProvider(fixtureRoot, store),
    }),
  };
}

describe("GET /api/projects/:id/export.pdf", () => {
  it("exports the no-key sample as a no-store PDF download", async () => {
    const { app } = harness("export-route-sample");
    const sample = await request(app).post("/api/projects/sample").send({});

    const response = await request(app).get(`/api/projects/${sample.body.id}/export.pdf`);
    const document = await PDFDocument.load(Uint8Array.from(response.body));

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/pdf/);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-disposition"])
      .toBe('attachment; filename="Nova-and-the-Moon-Kite.pdf"');
    expect(Buffer.from(response.body).subarray(0, 5).toString()).toBe("%PDF-");
    expect(document.getPageCount()).toBe(1);
  });

  it("sanitizes the filename without changing the project title", async () => {
    const { app, store } = harness("export-route-filename");
    const project = await new SampleProvider(fixtureRoot, store).copyToProject();
    project.title = 'Nova’s "Moon" Kite / ../';
    await store.save(project);

    const response = await request(app).get(`/api/projects/${project.id}/export.pdf`);

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"])
      .toBe('attachment; filename="Novas-Moon-Kite.pdf"');
    expect((await store.load(project.id)).title).toBe(project.title);
  });

  it("returns a recoverable safe error when a panel has no approved artwork", async () => {
    const { app, store } = harness("export-route-missing-approval");
    const project = await new SampleProvider(fixtureRoot, store).copyToProject();
    const panel = project.panels[0]!;
    delete panel.approvedImageVersionId;
    panel.imageVersions = panel.imageVersions.map((version) => ({
      ...version,
      status: "candidate" as const,
    }));
    await store.save(project);

    const before = await store.load(project.id);
    const response = await request(app).get(`/api/projects/${project.id}/export.pdf`);

    expect(response.status).toBe(409);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-type"]).toMatch(/^application\/json/);
    expect(response.body).toEqual({
      error: {
        code: "export",
        message: "Approve artwork for every panel before downloading the PDF.",
        retryable: true,
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/\/Users\/|tmp\/|stack|provider|sk-/i);
    expect(await store.load(project.id)).toEqual(before);
  });

  it("rejects an invalid asset declaration and fails safely when its file is missing", async () => {
    const { app, store } = harness("export-route-invalid-asset");
    const project = await new SampleProvider(fixtureRoot, store).copyToProject();
    const before = await store.load(project.id);
    const approved = project.panels[0]!.imageVersions[0]!;
    approved.localPath = "images/not-the-approved-id.png";
    await expect(store.save(project)).rejects.toThrow();
    expect(await store.load(project.id)).toEqual(before);

    const valid = await new SampleProvider(fixtureRoot, store).copyToProject();
    const imageId = valid.panels[0]!.approvedImageVersionId!;
    await fs.rename(
      await store.resolveImageAsset(valid.id, imageId),
      path.join(path.dirname(await store.resolveImageAsset(valid.id, imageId)), `${imageId}.missing`),
    );
    const missing = await request(app).get(`/api/projects/${valid.id}/export.pdf`);
    expect(missing.status).toBe(409);
    expect(missing.body.error).toMatchObject({ code: "export", retryable: true });
    expect(JSON.stringify(missing.body)).not.toMatch(/ENOENT|\/Users\/|tmp\//);
  });

  it("rejects unsafe or missing project ids with product-safe JSON", async () => {
    const { app } = harness("export-route-id-errors");

    const unsafe = await request(app).get("/api/projects/project_name/export.pdf");
    const missing = await request(app).get("/api/projects/missing-project/export.pdf");

    expect(unsafe.status).toBe(400);
    expect(unsafe.body.error).toMatchObject({ code: "export", retryable: false });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatchObject({ code: "export", retryable: false });
  });

  it("classifies malformed, non-square, and symlinked approved assets as recoverable export failures", async () => {
    const cases = [
      {
        label: "malformed",
        corrupt: async (filename: string) => fs.writeFile(filename, "not a png"),
      },
      {
        label: "non-square",
        corrupt: async (filename: string) => fs.writeFile(
          filename,
          await sharp({
            create: {
              width: 16,
              height: 8,
              channels: 4,
              background: { r: 111, g: 81, b: 216, alpha: 1 },
            },
          }).png().toBuffer(),
        ),
      },
      {
        label: "symlink",
        corrupt: async (filename: string) => {
          const outside = `${filename}.outside`;
          await fs.rename(filename, outside);
          await fs.symlink(outside, filename);
        },
      },
    ];

    for (const testCase of cases) {
      const { app, store } = harness(`export-route-${testCase.label}-asset`);
      const project = await new SampleProvider(fixtureRoot, store).copyToProject();
      const imageId = project.panels[0]!.approvedImageVersionId!;
      const filename = await store.resolveImageAsset(project.id, imageId);
      await testCase.corrupt(filename);

      const response = await request(app)
        .get(`/api/projects/${project.id}/export.pdf`);

      expect(response.status, testCase.label).toBe(409);
      expect(response.body, testCase.label).toEqual({
        error: {
          code: "export",
          message: "Approved artwork could not be read. Check the panel approval and try again.",
          retryable: true,
        },
      });
      expect(JSON.stringify(response.body)).not.toMatch(
        /project link|invalid_path|ENOENT|\/Users\/|tmp\/|stack/i,
      );
    }
  });
});
