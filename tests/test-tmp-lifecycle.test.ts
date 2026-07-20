import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  cleanupNewTmpEntries,
  diffTmpChildren,
  literalTmpPaths,
} from "./support/tmp-lifecycle";

describe("suite tmp lifecycle helpers", () => {
  it("selects only direct children created after the suite snapshot", () => {
    expect(diffTmpChildren(
      new Set(["retained", "another-retained"]),
      new Set(["retained", "another-retained", "new-a", "new-b"]),
    )).toEqual(["new-a", "new-b"]);
  });

  it("builds literal contained paths and rejects traversal or nested entries", () => {
    const root = path.resolve("tmp");
    expect(literalTmpPaths(root, ["new-a", "new-b"])).toEqual([
      path.join(root, "new-a"),
      path.join(root, "new-b"),
    ]);
    expect(() => literalTmpPaths(root, ["../escape"])).toThrow();
    expect(() => literalTmpPaths(root, ["nested/child"])).toThrow();
  });

  it("passes only new literal paths to Trash with globbing disabled", async () => {
    const trash = vi.fn().mockResolvedValue(undefined);
    await cleanupNewTmpEntries(
      path.resolve("tmp"),
      new Set(["retained"]),
      async () => new Set(["retained", "new-entry"]),
      trash,
    );

    expect(trash).toHaveBeenCalledWith(
      [path.resolve("tmp/new-entry")],
      { glob: false },
    );
  });
});
