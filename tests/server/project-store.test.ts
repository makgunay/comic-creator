import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  MAX_GENERATED_IMAGE_BYTES,
  ProjectStore,
} from "../../src/server/storage/project-store";
import { hasStaleEmbeddedLettering } from "../../src/domain/image-versions";
import { buildPdfLayout } from "../../src/server/export/pdf-layout";
import { makeImageVersion, makeProject } from "../fixtures/project-fixtures";
import { testTmpPath } from "../support/tmp-lifecycle";

function testRoot(label: string): string {
  return testTmpPath(label);
}

function legacyEmbeddedProject() {
  const project = makeProject();
  const overlay = {
    id: "legacy-dialogue",
    kind: "dialogue" as const,
    text: "Legacy exact words",
    x: .1,
    y: .15,
    width: .4,
    height: .2,
  };
  const version = makeImageVersion({
    id: "legacy-embedded",
    localPath: "images/legacy-embedded.png",
    status: "approved",
    letteringMode: "embedded",
  });
  const otherLegacyVersion = makeImageVersion({
    id: "legacy-candidate",
    localPath: "images/legacy-candidate.png",
    status: "candidate",
    letteringMode: "embedded",
  });
  project.panels[0]!.overlays = [
    overlay,
    {
      id: "empty-caption",
      kind: "caption",
      text: "",
      x: .1,
      y: .7,
      width: .8,
      height: .15,
    },
  ];
  project.panels[0]!.approvedImageVersionId = version.id;
  project.panels[0]!.imageVersions = [version, otherLegacyVersion];
  return project;
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
    readdir: (directory: string, options: { withFileTypes: true }) =>
      fs.readdir(directory, options),
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
  it("tolerates an EEXIST mkdir race only when a real directory won", async () => {
    const root = testRoot("project-store-mkdir-race-directory");
    let raced = false;
    const fileSystem = {
      ...filesystemFailingRename(() => false),
      mkdir: async (directory: string, options?: { recursive?: boolean }) => {
        if (!raced && directory === root) {
          raced = true;
          await fs.mkdir(directory, options);
          throw Object.assign(new Error("Directory won the race"), {
            code: "EEXIST",
          });
        }
        return fs.mkdir(directory, options);
      },
    };
    const store = new ProjectStore(root, fileSystem);

    await expect(store.save(makeProject())).resolves.toBeUndefined();
  });

  it.each(["symlink", "file"] as const)(
    "rejects an EEXIST mkdir race won by a %s",
    async (winner) => {
      const root = testRoot(`project-store-mkdir-race-${winner}`);
      const outside = testRoot(`project-store-mkdir-race-${winner}-outside`);
      const fileSystem = {
        ...filesystemFailingRename(() => false),
        mkdir: async (directory: string, options?: { recursive?: boolean }) => {
          if (directory === root) {
            await fs.mkdir(path.dirname(root), { recursive: true });
            if (winner === "symlink") {
              await fs.mkdir(outside, { recursive: true });
              await fs.symlink(outside, root);
            } else {
              await fs.writeFile(root, "not a directory", "utf8");
            }
            throw Object.assign(new Error("Unsafe path won the race"), {
              code: "EEXIST",
            });
          }
          return fs.mkdir(directory, options);
        },
      };
      const store = new ProjectStore(root, fileSystem);

      await expect(store.save(makeProject())).rejects.toMatchObject({
        code: "invalid_path",
      });
    },
  );

  it("preserves non-EEXIST mkdir errors", async () => {
    const root = testRoot("project-store-mkdir-other-error");
    const fileSystem = {
      ...filesystemFailingRename(() => false),
      mkdir: async () => {
        throw Object.assign(new Error("Injected permission failure"), {
          code: "EACCES",
        });
      },
    };
    const store = new ProjectStore(root, fileSystem);

    await expect(store.save(makeProject())).rejects.toMatchObject({
      code: "EACCES",
      message: "Injected permission failure",
    });
  });

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

  it("hydrates and then persists a baseline snapshot for legacy embedded lettering", async () => {
    const root = testRoot("project-store-legacy-lettering-hydration");
    const store = new ProjectStore(root);
    const project = legacyEmbeddedProject();
    await store.save(project);

    const loaded = await store.load(project.id);
    const baseline = [project.panels[0]!.overlays[0]!];
    expect(loaded.panels[0]!.imageVersions.map((version) => version.letteringSnapshot))
      .toEqual([baseline, undefined]);
    expect(loaded.panels[0]!.imageVersions[0]!.letteringSnapshot?.[0])
      .not.toBe(loaded.panels[0]!.overlays[0]);

    await store.save(loaded);
    const persisted = JSON.parse(await fs.readFile(
      path.join(root, "projects", project.id, "project.json"),
      "utf8",
    ));
    expect(persisted.panels[0].imageVersions.map(
      (version: { letteringSnapshot?: unknown }) => version.letteringSnapshot,
    )).toEqual([baseline, undefined]);
  });

  it("detects a post-load legacy edit and excludes the stale embedded raster", async () => {
    const store = new ProjectStore(testRoot("project-store-legacy-lettering-stale"));
    const project = legacyEmbeddedProject();
    await store.save(project);

    const loaded = await store.load(project.id);
    loaded.panels[0]!.overlays[0]!.x += .1;
    const version = loaded.panels[0]!.imageVersions[0]!;

    expect(hasStaleEmbeddedLettering(version, loaded.panels[0]!.overlays)).toBe(true);
    expect(buildPdfLayout(loaded)[0]!.panels[0]!.approvedImageVersionId)
      .toBeUndefined();
  });

  it("does not hydrate malformed embedded-lettering input into a valid project", async () => {
    const root = testRoot("project-store-malformed-legacy-lettering");
    const project = legacyEmbeddedProject();
    const malformed = structuredClone(project) as unknown as {
      panels: Array<{ imageVersions: Array<{ letteringSnapshot?: unknown }> }>;
    };
    malformed.panels[0]!.imageVersions[0]!.letteringSnapshot = "not-an-overlay-array";
    const directory = path.join(root, "projects", project.id);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, "project.json"),
      `${JSON.stringify(malformed)}\n`,
      "utf8",
    );
    const store = new ProjectStore(root);

    await expect(store.load(project.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("publishes only bounded 1024 by 1024 PNG artwork", async () => {
    const store = new ProjectStore(testRoot("project-store-image-bounds"));
    const project = makeProject();
    await store.save(project);
    const valid = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: "#6f51d8",
      },
    }).png().toBuffer();
    const wrongDimensions = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: "#6f51d8",
      },
    }).png().toBuffer();

    await expect(
      store.publishImageAsset(project.id, "valid-art", valid),
    ).resolves.toBeUndefined();
    await expect(
      store.publishImageAsset(project.id, "wrong-size", wrongDimensions),
    ).rejects.toMatchObject({ code: "provider" });
    await expect(
      store.publishImageAsset(
        project.id,
        "oversized-art",
        Buffer.alloc(MAX_GENERATED_IMAGE_BYTES + 1),
      ),
    ).rejects.toMatchObject({ code: "provider" });
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

  it("quarantines the staged project when first publish fails", async () => {
    const root = testRoot("project-store-first-publish-failure");
    const project = makeProject();
    const liveProject = path.join(root, "projects", project.id);
    const failingStore = new ProjectStore(
      root,
      filesystemFailingRename((_source, target) => target === liveProject),
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

  it("rolls back current without residue when backup publish fails", async () => {
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
    expect(await entriesOrEmpty(path.join(root, "staging"))).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "recovery"))).toEqual([]);
  });

  it("preserves current v2 and previous v1 byte-for-byte when v3 current publish fails", async () => {
    const root = testRoot("project-store-current-publish-contract");
    const projectV1 = makeProject();
    const stableStore = new ProjectStore(root);
    await stableStore.save(projectV1);
    const projectV2 = {
      ...projectV1,
      title: "Version two",
      updatedAt: "2026-07-20T04:00:00.000Z",
    };
    await stableStore.save(projectV2);
    const liveDirectory = path.join(root, "projects", projectV1.id);
    const currentPath = path.join(liveDirectory, "project.json");
    const previousPath = path.join(liveDirectory, "project.previous.json");
    const currentBefore = await fs.readFile(currentPath);
    const previousBefore = await fs.readFile(previousPath);
    const liveEntriesBefore = (await fs.readdir(liveDirectory)).sort();
    const failingStore = new ProjectStore(
      root,
      filesystemFailingRename((_source, target) =>
        target === currentPath
      ),
    );

    await expect(failingStore.save({
      ...projectV2,
      title: "Version three must not publish",
      updatedAt: "2026-07-20T05:00:00.000Z",
    })).rejects.toThrow("Injected rename failure");

    expect(await fs.readFile(currentPath)).toEqual(currentBefore);
    expect(await fs.readFile(previousPath)).toEqual(previousBefore);
    expect((await fs.readdir(liveDirectory)).sort()).toEqual(liveEntriesBefore);
  });

  it("keeps first-save residue in staging and aggregates publish plus quarantine failures", async () => {
    const root = testRoot("project-store-publish-cleanup-failure");
    const project = makeProject();
    const liveProject = path.join(root, "projects", project.id);
    const baseFileSystem = filesystemFailingRename(() => false);
    let publishFailed = false;
    const failingStore = new ProjectStore(root, {
      ...baseFileSystem,
      mkdir: async (directory, options) => {
        if (publishFailed && directory === path.join(root, "recovery")) {
          throw Object.assign(new Error("Injected quarantine creation failure"), {
            code: "EACCES",
          });
        }
        return fs.mkdir(directory, options);
      },
      rename: async (source, target) => {
        if (
          !publishFailed
          && (
            target === liveProject
            || target === path.join(liveProject, "project.json")
          )
        ) {
          publishFailed = true;
          throw Object.assign(new Error("Injected first publish failure"), {
            code: "EIO",
          });
        }
        return fs.rename(source, target);
      },
    });

    let caught: unknown;
    try {
      await failingStore.save(project);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors.map((error: Error) => error.message))
      .toEqual([
        "Injected first publish failure",
        "Injected quarantine creation failure",
      ]);
    expect(await entriesOrEmpty(path.join(root, "projects"))).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "recovery"))).toEqual([]);
    expect(await entriesOrEmpty(path.join(root, "staging"))).toHaveLength(1);
  });
});
