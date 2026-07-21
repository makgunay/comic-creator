import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectStore } from "../../src/server/storage/project-store";
import { prepareServerState } from "../../src/server/startup";
import { makeProject } from "../fixtures/project-fixtures";
import { testTmpPath } from "../support/tmp-lifecycle";

describe("production startup recovery", () => {
  it("reads project entries through the injected typed filesystem adapter", async () => {
    const root = testTmpPath("startup-readdir-adapter");
    const seedStore = new ProjectStore(root);
    await seedStore.save(makeProject());
    const calls: Array<{
      directory: string;
      options: { withFileTypes: true };
    }> = [];
    const fileSystem = {
      mkdir: fs.mkdir,
      readFile: fs.readFile,
      writeFile: fs.writeFile,
      copyFile: fs.copyFile,
      rename: fs.rename,
      lstat: fs.lstat,
      realpath: fs.realpath,
      readdir: async (directory: string, options: { withFileTypes: true }) => {
        calls.push({ directory, options });
        return fs.readdir(directory, options);
      },
    };
    const restartedProcess = new ProjectStore(root, fileSystem);

    await expect(restartedProcess.recoverInterruptedGenerations()).resolves.toBe(0);
    expect(calls).toEqual([
      {
        directory: path.join(root, "projects"),
        options: { withFileTypes: true },
      },
    ]);
  });

  it("recovers interrupted panels only when startup recovery is invoked", async () => {
    const root = testTmpPath("startup-recovery");
    const firstProcess = new ProjectStore(root);
    const project = makeProject();
    project.panels[0]!.generationStatus = "generating";
    await firstProcess.save(project);

    const restartedProcess = new ProjectStore(root);
    expect((await restartedProcess.load(project.id)).panels[0]!.generationStatus)
      .toBe("generating");
    await expect(restartedProcess.recoverInterruptedGenerations()).resolves.toBe(1);
    expect((await restartedProcess.load(project.id)).panels[0]!.generationStatus)
      .toBe("failed-retryable");
    const document = path.join(root, "projects", project.id, "project.json");
    const beforeIdempotentRecovery = await fs.stat(document);
    await expect(restartedProcess.recoverInterruptedGenerations()).resolves.toBe(0);
    const afterIdempotentRecovery = await fs.stat(document);
    expect(afterIdempotentRecovery.ino).toBe(beforeIdempotentRecovery.ino);
    expect(afterIdempotentRecovery.mtimeMs).toBe(beforeIdempotentRecovery.mtimeMs);
  });

  it("runs restart recovery for the normal unset-NODE_ENV server start path", async () => {
    const root = testTmpPath("startup-unset-env");
    const store = new ProjectStore(root);
    const project = makeProject();
    project.panels[0]!.generationStatus = "generating";
    await store.save(project);

    await expect(prepareServerState(store)).resolves.toBe(1);
    expect((await store.load(project.id)).panels[0]!.generationStatus)
      .toBe("failed-retryable");
  });
});
