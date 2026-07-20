import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import trash from "trash";
import { inject } from "vitest";

const MARKER_NAME = ".vitest-owned-root.json";
const MARKER_KIND = "comic-creator-vitest-run";

type TrashFunction = (
  paths: readonly string[],
  options: { glob: false },
) => Promise<void>;

export interface OwnedTmpRoot {
  repoTmpRoot: string;
  root: string;
  ownerId: string;
  markerPath: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    comicCreatorTmpRoot: OwnedTmpRoot;
  }
}

function assertDirectOwnedRoot(owned: OwnedTmpRoot): void {
  const repoTmpRoot = path.resolve(owned.repoTmpRoot);
  const root = path.resolve(owned.root);
  const expectedName = `vitest-run-${owned.ownerId}`;
  if (
    !/^[0-9a-f-]{36}$/i.test(owned.ownerId)
    || path.dirname(root) !== repoTmpRoot
    || path.basename(root) !== expectedName
    || path.resolve(owned.markerPath) !== path.join(root, MARKER_NAME)
  ) {
    throw new Error("Vitest temporary root ownership is invalid.");
  }
}

export async function createOwnedTmpRoot(
  repoTmpRoot = path.resolve("tmp"),
): Promise<OwnedTmpRoot> {
  const absoluteRepoTmpRoot = path.resolve(repoTmpRoot);
  await fs.mkdir(absoluteRepoTmpRoot, { recursive: true });
  const repoStats = await fs.lstat(absoluteRepoTmpRoot);
  if (repoStats.isSymbolicLink() || !repoStats.isDirectory()) {
    throw new Error("Repository temporary root must be a real directory.");
  }

  const ownerId = randomUUID();
  const root = path.join(absoluteRepoTmpRoot, `vitest-run-${ownerId}`);
  const markerPath = path.join(root, MARKER_NAME);
  const owned = { repoTmpRoot: absoluteRepoTmpRoot, root, ownerId, markerPath };
  assertDirectOwnedRoot(owned);
  await fs.mkdir(root);
  await fs.writeFile(
    markerPath,
    `${JSON.stringify({ kind: MARKER_KIND, ownerId, root })}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  return owned;
}

export async function validateOwnedTmpRoot(owned: OwnedTmpRoot): Promise<void> {
  assertDirectOwnedRoot(owned);
  const [repoStats, rootStats, markerStats] = await Promise.all([
    fs.lstat(owned.repoTmpRoot),
    fs.lstat(owned.root),
    fs.lstat(owned.markerPath),
  ]);
  if (
    repoStats.isSymbolicLink()
    || !repoStats.isDirectory()
    || rootStats.isSymbolicLink()
    || !rootStats.isDirectory()
    || markerStats.isSymbolicLink()
    || !markerStats.isFile()
  ) {
    throw new Error("Vitest temporary root ownership marker is unsafe.");
  }

  const [realRepoTmpRoot, realRoot, markerText] = await Promise.all([
    fs.realpath(owned.repoTmpRoot),
    fs.realpath(owned.root),
    fs.readFile(owned.markerPath, "utf8"),
  ]);
  if (path.dirname(realRoot) !== realRepoTmpRoot) {
    throw new Error("Vitest temporary root escaped the repository tmp directory.");
  }

  let marker: unknown;
  try {
    marker = JSON.parse(markerText);
  } catch {
    throw new Error("Vitest temporary root ownership marker is invalid.");
  }
  if (
    !marker
    || typeof marker !== "object"
    || !("kind" in marker)
    || marker.kind !== MARKER_KIND
    || !("ownerId" in marker)
    || marker.ownerId !== owned.ownerId
    || !("root" in marker)
    || marker.root !== owned.root
  ) {
    throw new Error("Vitest temporary root ownership marker does not match.");
  }
}

export async function cleanupOwnedTmpRoot(
  owned: OwnedTmpRoot,
  moveToTrash: TrashFunction = trash,
): Promise<void> {
  await validateOwnedTmpRoot(owned);
  await moveToTrash([owned.root], { glob: false });
}

export function testTmpRoot(): string {
  const owned = inject("comicCreatorTmpRoot");
  assertDirectOwnedRoot(owned);
  return owned.root;
}

function validateLabel(label: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(label)) {
    throw new Error("Test temporary labels must be simple path segments.");
  }
}

export function testTmpPath(label: string, suffix = ""): string {
  validateLabel(label);
  if (suffix && !/^\.[a-z0-9]+$/i.test(suffix)) {
    throw new Error("Test temporary suffixes must be simple extensions.");
  }
  return path.join(testTmpRoot(), `${label}-${randomUUID()}${suffix}`);
}

export async function makeTestTmpDirectory(label: string): Promise<string> {
  validateLabel(label);
  return fs.mkdtemp(path.join(testTmpRoot(), `${label}-`));
}
