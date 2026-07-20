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

  private invalidPath(message: string): Error {
    return Object.assign(new Error(message), { code: "invalid_path" });
  }

  private isWithin(parent: string, child: string): boolean {
    const relative = path.relative(parent, child);
    return relative !== ""
      && !relative.startsWith(`..${path.sep}`)
      && relative !== ".."
      && !path.isAbsolute(relative);
  }

  private async fixtureDocument(): Promise<string> {
    const fixtureStats = await fs.lstat(this.fixtureRoot);
    const document = path.join(this.fixtureRoot, "project.json");
    const documentStats = await fs.lstat(document);
    if (
      fixtureStats.isSymbolicLink()
      || !fixtureStats.isDirectory()
      || documentStats.isSymbolicLink()
      || !documentStats.isFile()
    ) {
      throw this.invalidPath("Sample fixture must use regular files");
    }
    const realRoot = await fs.realpath(this.fixtureRoot);
    const realDocument = await fs.realpath(document);
    if (!this.isWithin(realRoot, realDocument)) {
      throw this.invalidPath("Sample document escaped its fixture root");
    }
    return document;
  }

  private async sourcePath(localPath: string): Promise<string> {
    const imagesRoot = path.join(this.fixtureRoot, "images");
    const source = path.resolve(this.fixtureRoot, localPath);
    if (!source.startsWith(`${imagesRoot}${path.sep}`)) {
      throw this.invalidPath("Invalid sample image path");
    }
    const imagesStats = await fs.lstat(imagesRoot);
    const sourceStats = await fs.lstat(source);
    if (
      imagesStats.isSymbolicLink()
      || !imagesStats.isDirectory()
      || sourceStats.isSymbolicLink()
      || !sourceStats.isFile()
    ) {
      throw this.invalidPath("Sample images must be regular files");
    }
    const realImagesRoot = await fs.realpath(imagesRoot);
    const realSource = await fs.realpath(source);
    if (!this.isWithin(realImagesRoot, realSource)) {
      throw this.invalidPath("Sample image escaped its fixture images root");
    }
    return realSource;
  }

  async copyToProject(): Promise<Project> {
    const fixture = ProjectSchema.parse(JSON.parse(
      await fs.readFile(await this.fixtureDocument(), "utf8"),
    ));
    const project = structuredClone(fixture);
    project.id = randomUUID();
    project.createdAt = new Date().toISOString();
    project.updatedAt = project.createdAt;

    const imageVersions: ImageVersion[] = [
      ...project.hero.imageVersions,
      ...project.panels.flatMap((panel) => panel.imageVersions),
    ];
    const copies = imageVersions.map((version) => ({
      id: version.id,
      sourceKey: version.localPath,
    }));
    for (const version of imageVersions) {
      version.localPath = `images/${version.id}.png`;
    }

    const valid = ProjectSchema.parse(project);
    await this.store.createWithAssets(valid, async (assetPath) => {
      for (const copy of copies) {
        await fs.copyFile(
          await this.sourcePath(copy.sourceKey),
          assetPath(copy.id),
          constants.COPYFILE_FICLONE,
        );
      }
    });
    return valid;
  }
}
