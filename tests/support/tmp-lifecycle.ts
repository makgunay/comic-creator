import fs from "node:fs/promises";
import path from "node:path";
import trash from "trash";

type TrashFunction = (
  paths: readonly string[],
  options: { glob: false },
) => Promise<void>;

export async function snapshotTmpChildren(
  root: string,
): Promise<Set<string>> {
  try {
    return new Set(await fs.readdir(root));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return new Set();
    }
    throw error;
  }
}

export function diffTmpChildren(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
): string[] {
  return [...after].filter((entry) => !before.has(entry)).sort();
}

export function literalTmpPaths(root: string, entries: readonly string[]): string[] {
  const absoluteRoot = path.resolve(root);
  return entries.map((entry) => {
    if (
      !entry
      || entry === "."
      || entry === ".."
      || path.basename(entry) !== entry
      || entry.includes("\0")
    ) {
      throw new Error("Temporary cleanup accepts direct child names only.");
    }
    const candidate = path.resolve(absoluteRoot, entry);
    if (path.dirname(candidate) !== absoluteRoot) {
      throw new Error("Temporary cleanup path escaped its root.");
    }
    return candidate;
  });
}

export async function cleanupNewTmpEntries(
  root: string,
  before: ReadonlySet<string>,
  readCurrent: () => Promise<Set<string>> = () => snapshotTmpChildren(root),
  moveToTrash: TrashFunction = trash,
): Promise<void> {
  const after = await readCurrent();
  const paths = literalTmpPaths(root, diffTmpChildren(before, after));
  if (paths.length > 0) await moveToTrash(paths, { glob: false });
}
