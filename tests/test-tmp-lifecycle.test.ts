import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  cleanupOwnedTmpRoot,
  createOwnedTmpRoot,
  makeTestTmpDirectory,
  testTmpPath,
} from "./support/tmp-lifecycle";

describe("suite tmp lifecycle helpers", () => {
  it("retains an unrelated sibling created after setup and selects only the owned run root", async () => {
    const sandbox = await makeTestTmpDirectory("lifecycle-sandbox");
    const owned = await createOwnedTmpRoot(sandbox);
    const unrelated = path.join(sandbox, "unrelated-created-late");
    await fs.mkdir(unrelated);
    const moveToTrash = vi.fn().mockResolvedValue(undefined);

    await cleanupOwnedTmpRoot(owned, moveToTrash);

    expect(moveToTrash).toHaveBeenCalledWith([owned.root], { glob: false });
    await expect(fs.lstat(unrelated)).resolves.toMatchObject({});
  });

  it("rejects cleanup when the ownership marker was changed", async () => {
    const sandbox = await makeTestTmpDirectory("marker-sandbox");
    const owned = await createOwnedTmpRoot(sandbox);
    await fs.writeFile(owned.markerPath, "{}\n", "utf8");
    const moveToTrash = vi.fn().mockResolvedValue(undefined);

    await expect(cleanupOwnedTmpRoot(owned, moveToTrash)).rejects.toThrow(
      "ownership marker does not match",
    );
    expect(moveToTrash).not.toHaveBeenCalled();
  });

  it("surfaces Trash failures from teardown cleanup", async () => {
    const sandbox = await makeTestTmpDirectory("failure-sandbox");
    const owned = await createOwnedTmpRoot(sandbox);
    const failure = new Error("Trash unavailable");

    await expect(cleanupOwnedTmpRoot(
      owned,
      vi.fn().mockRejectedValue(failure),
    )).rejects.toBe(failure);
  });

  it("builds unique paths and directories beneath the provided run root", async () => {
    const file = testTmpPath("asset", ".png");
    const directory = await makeTestTmpDirectory("store");

    expect(path.dirname(file)).toBe(path.dirname(directory));
    expect(path.basename(file)).toMatch(/^asset-[0-9a-f-]{36}\.png$/);
    await expect(fs.lstat(directory)).resolves.toMatchObject({});
    expect(() => testTmpPath("../escape")).toThrow();
  });
});
