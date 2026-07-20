import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import {
  createProject,
  ProjectSchema,
  type Project,
} from "../../domain/project";

const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,127}$/;

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

function canRecoverFrom(error: unknown): boolean {
  return error instanceof SyntaxError
    || error instanceof ZodError
    || (error instanceof Error
      && "code" in error
      && (error as NodeJS.ErrnoException).code === "ENOENT");
}

export class ProjectStore {
  private readonly root: string;
  private readonly writes = new Map<string, Promise<void>>();

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private projectDir(id: string): string {
    return path.join(this.root, "projects", validateSegment(id, "project id"));
  }

  private async readDocument(filename: string): Promise<Project> {
    return ProjectSchema.parse(JSON.parse(await fs.readFile(filename, "utf8")));
  }

  async create(input: { title: string; localAuthorCredit: string }): Promise<Project> {
    const project = createProject(input);
    await this.save(project);
    return project;
  }

  async save(project: Project): Promise<void> {
    const valid = ProjectSchema.parse(project);
    const previousWrite = this.writes.get(valid.id) ?? Promise.resolve();
    const write = previousWrite.catch(() => undefined).then(async () => {
      const directory = this.projectDir(valid.id);
      const current = path.join(directory, "project.json");
      const previous = path.join(directory, "project.previous.json");
      const temporary = path.join(
        directory,
        `project.${randomUUID()}.tmp.json`,
      );
      await fs.mkdir(path.join(directory, "images"), { recursive: true });
      await fs.writeFile(
        temporary,
        `${JSON.stringify(valid, null, 2)}\n`,
        "utf8",
      );

      try {
        await this.readDocument(current);
        const backupTemporary = path.join(
          directory,
          `project.previous.${randomUUID()}.tmp.json`,
        );
        await fs.copyFile(current, backupTemporary);
        await fs.rename(backupTemporary, previous);
      } catch (error) {
        if (!canRecoverFrom(error)) throw error;
      }

      await fs.rename(temporary, current);
    });

    this.writes.set(valid.id, write);
    try {
      await write;
    } finally {
      if (this.writes.get(valid.id) === write) {
        this.writes.delete(valid.id);
      }
    }
  }

  async load(id: string): Promise<Project> {
    const directory = this.projectDir(id);
    for (const filename of ["project.json", "project.previous.json"]) {
      try {
        return await this.readDocument(path.join(directory, filename));
      } catch (error) {
        if (!canRecoverFrom(error)) throw error;
      }
    }
    throw new ProjectNotFoundError(`No valid project document for ${id}`);
  }

  assetPath(projectId: string, imageId: string): string {
    return path.join(
      this.projectDir(projectId),
      "images",
      `${validateSegment(imageId, "image id")}.png`,
    );
  }
}
