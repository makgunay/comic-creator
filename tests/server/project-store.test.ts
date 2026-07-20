import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ProjectStore } from "../../src/server/storage/project-store";
import { makeProject } from "../fixtures/project-fixtures";

function testRoot(label: string): string {
  return path.resolve("tmp", `${label}-${randomUUID()}`);
}

describe("ProjectStore", () => {
  it("creates and round-trips a schema-valid project", async () => {
    const store = new ProjectStore(testRoot("project-store-create"));

    const project = await store.create({
      title: "Nova and the Moon Kite",
      localAuthorCredit: "M.",
    });

    expect(await store.load(project.id)).toEqual(project);
  });

  it("round-trips a schema-valid project saved directly", async () => {
    const store = new ProjectStore(testRoot("project-store-save"));
    const project = makeProject();

    await store.save(project);

    expect(await store.load(project.id)).toEqual(project);
  });

  it("recovers the last valid document from the rolling backup", async () => {
    const root = testRoot("project-store-recovery");
    const store = new ProjectStore(root);
    const project = makeProject();
    await store.save(project);
    await store.save({
      ...project,
      title: "Second title",
      updatedAt: "2026-07-20T01:00:00.000Z",
    });
    await fs.writeFile(
      path.join(root, "projects", project.id, "project.json"),
      "{broken",
      "utf8",
    );

    expect((await store.load(project.id)).title).toBe(project.title);
  });

  it("keeps the current valid document when a replacement fails validation", async () => {
    const store = new ProjectStore(testRoot("project-store-rollback"));
    const project = makeProject();
    await store.save(project);

    await expect(store.save({ ...project, title: "" })).rejects.toThrow();

    expect(await store.load(project.id)).toEqual(project);
  });

  it.each(["../escape", "nested/project", ".", "project_name", "project id"])(
    "rejects unsafe project id %s",
    async (projectId) => {
      const store = new ProjectStore(testRoot("project-store-safe-project"));

      await expect(store.load(projectId)).rejects.toMatchObject({ code: "invalid_path" });
    },
  );

  it.each(["../escape", "nested/image", ".", "image_name", "image id"])(
    "rejects unsafe image id %s",
    (imageId) => {
      const store = new ProjectStore(testRoot("project-store-safe-image"));

      expect(() => store.assetPath("safe-project", imageId)).toThrowError(
        expect.objectContaining({ code: "invalid_path" }),
      );
    },
  );

  it("resolves image assets inside the validated project image directory", () => {
    const root = testRoot("project-store-asset");
    const store = new ProjectStore(root);

    expect(store.assetPath("safe-project", "safe-image")).toBe(
      path.join(root, "projects", "safe-project", "images", "safe-image.png"),
    );
  });
});
