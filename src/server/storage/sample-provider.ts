import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ProjectSchema, type ImageVersion, type Project } from "../../domain/project";
import { ProjectStore } from "./project-store";

export class SampleProvider {
  private readonly fixtureRoot: string;

  constructor(fixtureRoot: string, private readonly store: ProjectStore) {
    this.fixtureRoot = path.resolve(fixtureRoot);
  }

  private sourcePath(localPath: string): string {
    const imagesRoot = path.join(this.fixtureRoot, "images");
    const source = path.resolve(this.fixtureRoot, localPath);
    if (!source.startsWith(`${imagesRoot}${path.sep}`)) {
      throw Object.assign(new Error("Invalid sample image path"), {
        code: "invalid_path",
      });
    }
    return source;
  }

  async copyToProject(): Promise<Project> {
    const fixture = ProjectSchema.parse(JSON.parse(
      await fs.readFile(path.join(this.fixtureRoot, "project.json"), "utf8"),
    ));
    const project = structuredClone(fixture);
    project.id = randomUUID();
    project.createdAt = new Date().toISOString();
    project.updatedAt = project.createdAt;

    const imageVersions: ImageVersion[] = [
      ...project.hero.imageVersions,
      ...project.panels.flatMap((panel) => panel.imageVersions),
    ];
    for (const version of imageVersions) {
      const target = this.store.assetPath(project.id, version.id);
      const temporary = `${target}.${randomUUID()}.tmp`;
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(
        this.sourcePath(version.localPath),
        temporary,
        constants.COPYFILE_FICLONE,
      );
      await fs.rename(temporary, target);
      version.localPath = `images/${version.id}.png`;
    }

    const valid = ProjectSchema.parse(project);
    await this.store.save(valid);
    return valid;
  }
}
