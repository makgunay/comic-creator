import fs from "node:fs/promises";
import fsSync, { type Dirent, type Stats } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { ZodError } from "zod";
import {
  createProject,
  ProjectSchema,
  type CreateProjectInput,
  type Project,
} from "../../domain/project";
import { hydrateLegacyEmbeddedLettering } from "../../domain/image-versions";

const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,127}$/;
export const MAX_GENERATED_IMAGE_BYTES = 20 * 1024 * 1024;
const ARTWORK_DIMENSION = 1024;

export interface ProjectStoreFileSystem {
  mkdir(
    directory: string,
    options?: { recursive?: boolean },
  ): Promise<string | undefined>;
  readFile(filename: string, encoding: "utf8"): Promise<string>;
  writeFile(
    filename: string,
    data: string | Uint8Array,
    encoding?: BufferEncoding,
  ): Promise<void>;
  copyFile(source: string, target: string, mode?: number): Promise<void>;
  rename(source: string, target: string): Promise<void>;
  readdir(
    directory: string,
    options: { withFileTypes: true },
  ): Promise<Dirent<string>[]>;
  lstat(filename: string): Promise<Stats>;
  realpath(filename: string): Promise<string>;
}

const nodeFileSystem: ProjectStoreFileSystem = {
  mkdir: (directory, options) => fs.mkdir(directory, options),
  readFile: (filename, encoding) => fs.readFile(filename, encoding),
  writeFile: (filename, data, encoding) =>
    encoding
      ? fs.writeFile(filename, data, encoding)
      : fs.writeFile(filename, data),
  copyFile: (source, target, mode) => fs.copyFile(source, target, mode),
  rename: (source, target) => fs.rename(source, target),
  readdir: (directory, options) => fs.readdir(directory, options),
  lstat: (filename) => fs.lstat(filename),
  realpath: (filename) => fs.realpath(filename),
};

class StoragePathError extends Error {
  readonly code = "invalid_path";
}

class ProjectNotFoundError extends Error {
  readonly code = "not_found";
}

function validateSegment(value: string, label: string): string {
  if (!SAFE_SEGMENT.test(value)) {
    throw new StoragePathError(`Invalid ${label}`);
  }
  return value;
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String(error.code)
    : undefined;
}

function isMissing(error: unknown): boolean {
  return errorCode(error) === "ENOENT";
}

function canRecoverFrom(error: unknown): boolean {
  return error instanceof SyntaxError
    || error instanceof ZodError
    || isMissing(error);
}

function providerArtworkError(): Error & { code: "provider" } {
  return Object.assign(new Error("Artwork did not meet the local image contract"), {
    code: "provider" as const,
  });
}

function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === ""
    || (!relative.startsWith(`..${path.sep}`)
      && relative !== ".."
      && !path.isAbsolute(relative));
}

export class ProjectStore {
  private readonly root: string;
  private readonly writes = new Map<string, Promise<unknown>>();

  constructor(
    root: string,
    private readonly fileSystem: ProjectStoreFileSystem = nodeFileSystem,
  ) {
    this.root = path.resolve(root);
  }

  private projectDir(id: string): string {
    return path.join(this.root, "projects", validateSegment(id, "project id"));
  }

  private assertWithinRoot(target: string): void {
    if (!isWithin(this.root, path.resolve(target))) {
      throw new StoragePathError("Storage path escaped its configured root");
    }
  }

  private async lstatIfExists(filename: string): Promise<Stats | undefined> {
    try {
      return await this.fileSystem.lstat(filename);
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  }

  private async assertSafePath(target: string): Promise<void> {
    const resolved = path.resolve(target);
    this.assertWithinRoot(resolved);
    const relative = path.relative(this.root, resolved);
    const components = relative ? relative.split(path.sep) : [];
    let current = this.root;
    const paths = [current];
    for (const component of components) {
      current = path.join(current, component);
      paths.push(current);
    }

    for (const [index, candidate] of paths.entries()) {
      const stats = await this.lstatIfExists(candidate);
      if (!stats) return;
      if (stats.isSymbolicLink()) {
        throw new StoragePathError("Symlinks are not allowed in storage paths");
      }
      if (index < paths.length - 1 && !stats.isDirectory()) {
        throw new StoragePathError("Storage path component is not a directory");
      }
    }
  }

  private assertSafePathSync(target: string): void {
    const resolved = path.resolve(target);
    this.assertWithinRoot(resolved);
    const relative = path.relative(this.root, resolved);
    const components = relative ? relative.split(path.sep) : [];
    let current = this.root;
    const paths = [current];
    for (const component of components) {
      current = path.join(current, component);
      paths.push(current);
    }

    for (const [index, candidate] of paths.entries()) {
      let stats: Stats;
      try {
        stats = fsSync.lstatSync(candidate);
      } catch (error) {
        if (isMissing(error)) return;
        throw error;
      }
      if (stats.isSymbolicLink()) {
        throw new StoragePathError("Symlinks are not allowed in storage paths");
      }
      if (index < paths.length - 1 && !stats.isDirectory()) {
        throw new StoragePathError("Storage path component is not a directory");
      }
    }
  }

  private async ensureDirectory(directory: string): Promise<void> {
    const resolved = path.resolve(directory);
    this.assertWithinRoot(resolved);
    if (resolved !== this.root) {
      await this.ensureDirectory(path.dirname(resolved));
    }
    const existing = await this.lstatIfExists(resolved);
    if (existing) {
      if (existing.isSymbolicLink() || !existing.isDirectory()) {
        throw new StoragePathError("Storage directory is not a real directory");
      }
      return;
    }
    try {
      await this.fileSystem.mkdir(resolved, {
        recursive: resolved === this.root,
      });
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
    const created = await this.fileSystem.lstat(resolved);
    if (created.isSymbolicLink() || !created.isDirectory()) {
      throw new StoragePathError("Storage directory is not a real directory");
    }
  }

  private async readDocument(filename: string): Promise<Project> {
    return ProjectSchema.parse(
      JSON.parse(await this.fileSystem.readFile(filename, "utf8")),
    );
  }

  private async quarantineExisting(
    candidates: readonly string[],
    label: string,
  ): Promise<void> {
    const existing: string[] = [];
    for (const candidate of candidates) {
      if (await this.lstatIfExists(candidate)) existing.push(candidate);
    }
    if (existing.length === 0) return;

    const recoveryRoot = path.join(this.root, "recovery");
    await this.ensureDirectory(recoveryRoot);
    const quarantine = path.join(
      recoveryRoot,
      `${validateSegment(label, "recovery label")}-${randomUUID()}`,
    );
    await this.ensureDirectory(quarantine);
    for (const candidate of existing) {
      await this.fileSystem.rename(
        candidate,
        path.join(quarantine, path.basename(candidate)),
      );
    }
  }

  private async failWithCleanup(
    primaryError: unknown,
    candidates: readonly string[],
    label: string,
  ): Promise<never> {
    try {
      await this.quarantineExisting(candidates, label);
    } catch (cleanupError) {
      const primaryErrors = primaryError instanceof AggregateError
        ? [...primaryError.errors]
        : [primaryError];
      throw new AggregateError(
        [...primaryErrors, cleanupError],
        "Storage transaction and recovery both failed",
      );
    }
    throw primaryError;
  }

  private async assertRegularContainedFile(
    container: string,
    filename: string,
  ): Promise<void> {
    await this.assertSafePath(container);
    await this.assertSafePath(filename);
    const containerStats = await this.fileSystem.lstat(container);
    const fileStats = await this.fileSystem.lstat(filename);
    if (
      containerStats.isSymbolicLink()
      || !containerStats.isDirectory()
      || fileStats.isSymbolicLink()
      || !fileStats.isFile()
    ) {
      throw new StoragePathError("Asset must be a regular contained file");
    }
    const realContainer = await this.fileSystem.realpath(container);
    const realFile = await this.fileSystem.realpath(filename);
    if (!isWithin(realContainer, realFile) || realContainer === realFile) {
      throw new StoragePathError("Asset escaped its staging directory");
    }
  }

  private async assertArtworkContract(filename: string): Promise<void> {
    const stats = await this.fileSystem.lstat(filename);
    if (stats.size > MAX_GENERATED_IMAGE_BYTES) throw providerArtworkError();
    const metadata = await sharp(filename).metadata().catch(() => undefined);
    if (
      metadata?.format !== "png"
      || metadata.width !== ARTWORK_DIMENSION
      || metadata.height !== ARTWORK_DIMENSION
    ) {
      throw providerArtworkError();
    }
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const project = createProject(input);
    await this.save(project);
    return project;
  }

  private async enqueue<T>(projectId: string, work: () => Promise<T>): Promise<T> {
    const previousWrite = this.writes.get(projectId) ?? Promise.resolve();
    const queued = previousWrite.catch(() => undefined).then(work);
    this.writes.set(projectId, queued);
    try {
      return await queued;
    } finally {
      if (this.writes.get(projectId) === queued) {
        this.writes.delete(projectId);
      }
    }
  }

  private async persist(project: Project): Promise<void> {
    const directory = this.projectDir(project.id);
    const staging = path.join(this.root, "staging");

    await this.ensureDirectory(staging);
    await this.assertSafePath(directory);
    const liveDirectoryExisted = Boolean(
      await this.lstatIfExists(directory),
    );
    if (liveDirectoryExisted) {
      await this.saveExistingProject(project, directory, staging);
    } else {
      await this.saveNewProject(project, directory, staging);
    }
  }

  private async saveNewProject(
    project: Project,
    liveProject: string,
    stagingRoot: string,
  ): Promise<void> {
    const stagedProject = path.join(
      stagingRoot,
      `project-${project.id}-${randomUUID()}`,
    );
    const stagedImages = path.join(stagedProject, "images");
    const stagedDocument = path.join(stagedProject, "project.json");
    try {
      await this.ensureDirectory(stagedImages);
      await this.fileSystem.writeFile(
        stagedDocument,
        `${JSON.stringify(project, null, 2)}\n`,
        "utf8",
      );
      await this.readDocument(stagedDocument);
      await this.ensureDirectory(path.join(this.root, "projects"));
      await this.assertSafePath(liveProject);
      if (await this.lstatIfExists(liveProject)) {
        throw Object.assign(new Error("Project already exists"), {
          code: "already_exists",
        });
      }
      await this.fileSystem.rename(stagedProject, liveProject);
    } catch (error) {
      await this.failWithCleanup(
        error,
        [stagedProject],
        `save-${project.id}`,
      );
    }
  }

  private async saveExistingProject(
    project: Project,
    directory: string,
    stagingRoot: string,
  ): Promise<void> {
    const current = path.join(directory, "project.json");
    const previous = path.join(directory, "project.previous.json");
    const token = `save-${project.id}-${randomUUID()}`;
    const stagedCurrent = path.join(stagingRoot, `${token}.project.json`);
    const stagedPrevious = path.join(stagingRoot, `${token}.previous.json`);
    let hasStagedPrevious = false;

    try {
      await this.fileSystem.writeFile(
        stagedCurrent,
        `${JSON.stringify(project, null, 2)}\n`,
        "utf8",
      );
      await this.readDocument(stagedCurrent);
      await this.assertSafePath(current);
      await this.assertSafePath(previous);

      try {
        await this.readDocument(current);
        await this.fileSystem.copyFile(current, stagedPrevious);
        await this.readDocument(stagedPrevious);
        hasStagedPrevious = true;
      } catch (error) {
        if (!canRecoverFrom(error)) throw error;
      }

      await this.fileSystem.rename(stagedCurrent, current);
      if (hasStagedPrevious) {
        try {
          await this.fileSystem.rename(stagedPrevious, previous);
        } catch (backupError) {
          try {
            await this.fileSystem.rename(stagedPrevious, current);
          } catch (rollbackError) {
            throw new AggregateError(
              [backupError, rollbackError],
              "Backup publication and current rollback both failed",
            );
          }
          throw backupError;
        }
      }
    } catch (error) {
      await this.failWithCleanup(
        error,
        [stagedCurrent, stagedPrevious],
        `save-${project.id}`,
      );
    }
  }

  async save(project: Project): Promise<void> {
    const valid = ProjectSchema.parse(project);
    await this.enqueue(valid.id, () => this.persist(valid));
  }

  async mutate(
    id: string,
    mutator: (current: Project) => Project | Promise<Project>,
  ): Promise<Project> {
    validateSegment(id, "project id");
    return this.enqueue(id, async () => {
      const current = await this.load(id);
      const next = ProjectSchema.parse(await mutator(structuredClone(current)));
      if (next.id !== id) {
        throw new StoragePathError("Project mutation changed its project id");
      }
      await this.persist(next);
      return next;
    });
  }

  async createWithAssets(
    project: Project,
    populate: (assetPath: (imageId: string) => string) => Promise<void>,
  ): Promise<void> {
    const valid = ProjectSchema.parse(project);
    const stagingRoot = path.join(this.root, "staging");
    await this.ensureDirectory(stagingRoot);
    const stagedProject = path.join(
      stagingRoot,
      `project-${valid.id}-${randomUUID()}`,
    );
    const stagedImages = path.join(stagedProject, "images");
    const liveProject = this.projectDir(valid.id);

    const stagedAssetPath = (imageId: string) => {
      const filename = path.join(
        stagedImages,
        `${validateSegment(imageId, "image id")}.png`,
      );
      this.assertSafePathSync(filename);
      return filename;
    };

    try {
      await this.ensureDirectory(stagedImages);
      await populate(stagedAssetPath);
      const versions = [
        ...valid.hero.imageVersions,
        ...valid.panels.flatMap((panel) => panel.imageVersions),
      ];
      for (const version of versions) {
        const filename = stagedAssetPath(version.id);
        await this.assertRegularContainedFile(stagedImages, filename);
        await this.assertArtworkContract(filename);
      }
      const stagedDocument = path.join(stagedProject, "project.json");
      await this.fileSystem.writeFile(
        stagedDocument,
        `${JSON.stringify(valid, null, 2)}\n`,
        "utf8",
      );
      await this.readDocument(stagedDocument);
      await this.ensureDirectory(path.join(this.root, "projects"));
      await this.assertSafePath(liveProject);
      if (await this.lstatIfExists(liveProject)) {
        throw Object.assign(new Error("Project already exists"), {
          code: "already_exists",
        });
      }
      await this.fileSystem.rename(stagedProject, liveProject);
    } catch (error) {
      await this.failWithCleanup(
        error,
        [stagedProject],
        `project-${valid.id}`,
      );
    }
  }

  async load(id: string): Promise<Project> {
    const directory = this.projectDir(id);
    await this.assertSafePath(directory);
    for (const filename of ["project.json", "project.previous.json"]) {
      const document = path.join(directory, filename);
      try {
        await this.assertSafePath(document);
        return hydrateLegacyEmbeddedLettering(await this.readDocument(document));
      } catch (error) {
        if (!canRecoverFrom(error)) throw error;
      }
    }
    throw new ProjectNotFoundError(`No valid project document for ${id}`);
  }

  async recoverInterruptedGenerations(): Promise<number> {
    const projectsRoot = path.join(this.root, "projects");
    await this.assertSafePath(projectsRoot);
    let entries: Dirent<string>[];
    try {
      entries = await this.fileSystem.readdir(projectsRoot, {
        withFileTypes: true,
      });
    } catch (error) {
      if (isMissing(error)) return 0;
      throw error;
    }

    let recoveredProjects = 0;
    for (const entry of entries) {
      if (
        !entry.isDirectory()
        || !SAFE_SEGMENT.test(entry.name)
      ) {
        continue;
      }
      try {
        const persisted = await this.load(entry.name);
        if (!persisted.panels.some((panel) =>
          panel.generationStatus === "generating")) {
          continue;
        }
        await this.mutate(entry.name, (project) => {
          const panels = project.panels.map((panel) => {
            if (panel.generationStatus !== "generating") return panel;
            return { ...panel, generationStatus: "failed-retryable" as const };
          });
          return {
            ...project,
            panels,
            updatedAt: new Date().toISOString(),
          };
        });
        recoveredProjects += 1;
      } catch {
        // One unreadable project must not prevent other local projects from
        // becoming available. Its existing current/backup documents stay intact.
      }
    }
    return recoveredProjects;
  }

  async publishImageAsset(
    projectId: string,
    imageId: string,
    bytes: Uint8Array,
  ): Promise<void> {
    const safeProjectId = validateSegment(projectId, "project id");
    const safeImageId = validateSegment(imageId, "image id");
    const stagingRoot = path.join(this.root, "staging");
    const staged = path.join(
      stagingRoot,
      `image-${safeProjectId}-${safeImageId}-${randomUUID()}.png`,
    );
    const target = this.assetPath(safeProjectId, safeImageId);
    try {
      if (bytes.byteLength > MAX_GENERATED_IMAGE_BYTES) {
        throw providerArtworkError();
      }
      await this.ensureDirectory(stagingRoot);
      await this.fileSystem.writeFile(staged, bytes);
      await this.assertRegularContainedFile(stagingRoot, staged);
      await this.assertArtworkContract(staged);
      const images = path.dirname(target);
      await this.assertSafePath(images);
      const imagesStats = await this.fileSystem.lstat(images);
      if (imagesStats.isSymbolicLink() || !imagesStats.isDirectory()) {
        throw new StoragePathError("Project images path is not a real directory");
      }
      if (await this.lstatIfExists(target)) {
        throw Object.assign(new Error("Image asset already exists"), {
          code: "already_exists",
        });
      }
      await this.fileSystem.rename(staged, target);
    } catch (error) {
      await this.failWithCleanup(
        error,
        [staged],
        `image-${safeProjectId}`,
      );
    }
  }

  async quarantineImageAsset(projectId: string, imageId: string): Promise<void> {
    const safeProjectId = validateSegment(projectId, "project id");
    const safeImageId = validateSegment(imageId, "image id");
    await this.quarantineExisting(
      [this.assetPath(safeProjectId, safeImageId)],
      `orphan-${safeProjectId}`,
    );
  }

  async resolveImageAsset(projectId: string, imageId: string): Promise<string> {
    const filename = this.assetPath(projectId, imageId);
    const images = path.dirname(filename);
    await this.assertRegularContainedFile(images, filename);
    try {
      await this.assertArtworkContract(filename);
    } catch {
      throw new StoragePathError("Image asset does not meet the artwork contract");
    }
    return filename;
  }

  assetPath(projectId: string, imageId: string): string {
    const filename = path.join(
      this.projectDir(projectId),
      "images",
      `${validateSegment(imageId, "image id")}.png`,
    );
    this.assertSafePathSync(filename);
    return filename;
  }
}
