import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ProjectStore } from "../../src/server/storage/project-store";
import { makeProject } from "../fixtures/project-fixtures";

function testRoot(label: string): string {
  return path.resolve("tmp", `${label}-${randomUUID()}`);
}

async function entriesOrEmpty(directory: string): Promise<string[]> {
  try {
    return await fs.readdir(directory);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function filesystemFailingRename(
  shouldFail: (source: string, target: string) => boolean,
) {
  let failed = false;
  return {
    mkdir: fs.mkdir,
    readFile: fs.readFile,
    writeFile: fs.writeFile,
    copyFile: fs.copyFile,
    lstat: fs.lstat,
    realpath: fs.realpath,
    rename: async (source: string, target: string) => {
      if (!failed && shouldFail(source, target)) {
        failed = true;
        throw Object.assign(new Error("Injected rename failure"), { code: "EIO" });
      }
      return fs.rename(source, target);
    },
  };
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

  it("rejects a symlinked projects directory without writing outside the root", async () => {
    const root = testRoot("project-store-projects-symlink");
    const outside = testRoot("project-store-projects-outside");
    await fs.mkdir(root, { recursive: true });
    await fs.mkdir(outside, { recursive: true });
    await fs.symlink(outside, path.join(root, "projects"));
    const store = new ProjectStore(root);

    await expect(store.save(makeProject())).rejects.toMatchObject({
      code: "invalid_path",
    });
    expect(await entriesOrEmpty(outside)).toEqual([]);
  });

  it("rejects load through a symlinked project directory", async () => {
    const root = testRoot("project-store-load-symlink");
    const outside = testRoot("project-store-load-outside");
    const project = makeProject();
    await fs.mkdir(path.join(root, "projects"), { recursive: true });
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(
      path.join(outside, "project.json"),
      `${JSON.stringify(project)}\n`,
      "utf8",
    );
    await fs.symlink(outside, path.join(root, "projects", project.id));
    const store = new ProjectStore(root);

    await expect(store.load(project.id)).rejects.toMatchObject({
      code: "invalid_path",
    });
  });

  it("rejects asset paths through a symlinked project directory", async () => {
    const root = testRoot("project-store-asset-symlink");
    const outside = testRoot("project-store-asset-outside");
    await fs.mkdir(path.join(root, "projects"), { recursive: true });
    await fs.mkdir(outside, { recursive: true });
    await fs.symlink(outside, path.join(root, "projects", "safe-project"));
    const store = new ProjectStore(root);

    expect(() => store.assetPath("safe-project", "safe-image")).toThrowError(
      expect.objectContaining({ code: "invalid_path" }),
    );
  });

  it("quarantines staged project data when current-document publish fails", async () => {
    const root = testRoot("project-store-publish-failure");
    const project = makeProject();
    const stableStore = new ProjectStore(root);
    await stableStore.save(project);
    const failingStore = new ProjectStore(
      root,
      filesystemFailingRename((_source, target) =>
        path.basename(target) === "project.json"
      ),
    );

    await expect(failingStore.save({
      ...project,
      title: "Must not publish",
      updatedAt: "2026-07-20T02:00:00.000Z",
    })).rejects.toThrow("Injected rename failure");

    expect(await stableStore.load(project.id)).toEqual(project);
    expect(
      (await entriesOrEmpty(path.join(root, "projects", project.id)))
        .filter((entry) => entry.includes(".tmp")),
    ).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "recovery"))).not.toEqual([]);
  });

  it("quarantines a newly created live directory when first publish fails", async () => {
    const root = testRoot("project-store-first-publish-failure");
    const project = makeProject();
    const failingStore = new ProjectStore(
      root,
      filesystemFailingRename((_source, target) =>
        path.basename(target) === "project.json"
      ),
    );

    await expect(failingStore.save(project)).rejects.toThrow(
      "Injected rename failure",
    );

    expect(await entriesOrEmpty(path.join(root, "projects"))).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "recovery"))).not.toEqual([]);
  });

  it("quarantines a partially created asset-staging directory", async () => {
    const root = testRoot("project-store-staging-mkdir-failure");
    const project = makeProject();
    const baseFileSystem = filesystemFailingRename(() => false);
    let failed = false;
    const failingStore = new ProjectStore(root, {
      ...baseFileSystem,
      mkdir: async (directory, options) => {
        if (
          !failed
          && path.basename(directory) === "images"
          && directory.includes(`${path.sep}staging${path.sep}project-`)
        ) {
          failed = true;
          throw Object.assign(new Error("Injected staging mkdir failure"), {
            code: "EIO",
          });
        }
        return fs.mkdir(directory, options);
      },
    });

    await expect(
      failingStore.createWithAssets(project, async () => undefined),
    ).rejects.toThrow("Injected staging mkdir failure");

    expect(await entriesOrEmpty(path.join(root, "projects"))).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "staging"))).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "recovery"))).not.toEqual([]);
  });

  it("quarantines staged backup data when backup publish fails", async () => {
    const root = testRoot("project-store-backup-failure");
    const project = makeProject();
    const stableStore = new ProjectStore(root);
    await stableStore.save(project);
    const failingStore = new ProjectStore(
      root,
      filesystemFailingRename((_source, target) =>
        path.basename(target) === "project.previous.json"
      ),
    );

    await expect(failingStore.save({
      ...project,
      title: "Must not replace current",
      updatedAt: "2026-07-20T03:00:00.000Z",
    })).rejects.toThrow("Injected rename failure");

    expect(await stableStore.load(project.id)).toEqual(project);
    expect(
      (await entriesOrEmpty(path.join(root, "projects", project.id)))
        .filter((entry) => entry.includes(".tmp")),
    ).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "recovery"))).not.toEqual([]);
  });
});
