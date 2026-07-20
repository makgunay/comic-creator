import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Project } from "../../src/domain/project";
import type {
  GeneratedImage,
  GenerationProvider,
  RenderingChoices,
  VisualInput,
} from "../../src/server/generation/contracts";
import { GenerationService } from "../../src/server/generation/generation-service";
import { ProjectStore } from "../../src/server/storage/project-store";
import { makeImageVersion, makeProject } from "./project-fixtures";

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export async function validPngBytes(): Promise<Buffer> {
  return sharp({
    create: {
      width: 12,
      height: 12,
      channels: 4,
      background: { r: 111, g: 81, b: 216, alpha: 1 },
    },
  }).png().toBuffer();
}

export class RecordingProvider implements GenerationProvider {
  readonly moderations: string[] = [];
  readonly visualInputs: VisualInput[] = [];
  readonly heroPrompts: string[] = [];
  readonly panelPrompts: string[] = [];
  readonly references: string[] = [];

  constructor(
    private readonly generatedBytes: Buffer,
    private readonly panelGate?: Deferred<void>,
  ) {}

  async moderate(text: string): Promise<void> {
    this.moderations.push(text);
  }

  async chooseRendering(input: VisualInput): Promise<RenderingChoices> {
    this.visualInputs.push(structuredClone(input));
    return {
      shotSize: "wide",
      cameraAngle: "eye_level",
      lighting: "moonlit",
      palette: "cool",
      focus: "action",
    };
  }

  async generateHero(prompt: string): Promise<GeneratedImage> {
    this.heroPrompts.push(prompt);
    return { bytes: this.generatedBytes, durationMs: 11 };
  }

  async generatePanel(referencePath: string, prompt: string): Promise<GeneratedImage> {
    this.references.push(referencePath);
    this.panelPrompts.push(prompt);
    if (this.panelGate) await this.panelGate.promise;
    return { bytes: this.generatedBytes, durationMs: 13 };
  }
}

export function makeProjectWithApprovedPanel(): Project {
  const project = makeProject();
  project.hero = {
    ...project.hero,
    childDescription: "Nova wears a violet jacket and round goggles.",
    approvedReferenceImageId: "hero-approved",
    imageVersions: [
      makeImageVersion({
        id: "hero-approved",
        localPath: "images/hero-approved.png",
        status: "approved",
      }),
      makeImageVersion({
        id: "hero-candidate",
        localPath: "images/hero-candidate.png",
        status: "candidate",
      }),
    ],
  };
  project.panels[0] = {
    ...project.panels[0]!,
    action: "Nova launches the moon kite.",
    setting: "A rooftop at night.",
    mood: "Hopeful",
    framing: "Wide",
    approvedImageVersionId: "approved-old",
    imageVersions: [
      makeImageVersion({
        id: "approved-old",
        localPath: "images/approved-old.png",
        status: "approved",
      }),
      makeImageVersion({
        id: "panel-candidate",
        localPath: "images/panel-candidate.png",
        status: "candidate",
      }),
    ],
  };
  return project;
}

export async function createGenerationHarness(
  project: Project,
  provider?: RecordingProvider,
) {
  const root = path.resolve("tmp", `generation-${randomUUID()}`);
  const store = new ProjectStore(root);
  await store.save(project);
  const bytes = await validPngBytes();
  const versions = [
    ...project.hero.imageVersions,
    ...project.panels.flatMap((panel) => panel.imageVersions),
  ];
  await Promise.all(versions.map(async (version) => {
    await fs.writeFile(store.assetPath(project.id, version.id), bytes);
  }));
  const activeProvider = provider ?? new RecordingProvider(bytes);
  return {
    root,
    provider: activeProvider,
    store,
    service: new GenerationService(store, activeProvider),
  };
}
