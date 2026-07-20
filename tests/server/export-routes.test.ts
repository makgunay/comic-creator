import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app";
import { readConfig } from "../../src/server/config";
import { SampleProvider } from "../../src/server/storage/sample-provider";
import { ProjectStore } from "../../src/server/storage/project-store";

const fixtureRoot = path.resolve("sample-assets/moon-kite");

function harness(label: string) {
  const root = path.resolve("tmp", `${label}-${randomUUID()}`);
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
    const sample = await request(app).post("/api/projects/sample");

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

  it("fails safely when an approved asset declaration or file is invalid", async () => {
    const { app, store } = harness("export-route-invalid-asset");
    const project = await new SampleProvider(fixtureRoot, store).copyToProject();
    const approved = project.panels[0]!.imageVersions[0]!;
    approved.localPath = "images/not-the-approved-id.png";
    await store.save(project);

    const declaration = await request(app).get(`/api/projects/${project.id}/export.pdf`);
    expect(declaration.status).toBe(409);
    expect(declaration.body.error).toMatchObject({
      code: "export",
      retryable: true,
    });
    expect(JSON.stringify(declaration.body)).not.toMatch(/not-the-approved-id|\/Users\/|tmp\//);

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
});
