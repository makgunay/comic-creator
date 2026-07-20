import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import trash from "trash";
import { describe, expect, it } from "vitest";
import { createProject } from "../../src/domain/project";
import { paginatePanels } from "../../src/domain/pagination";
import { renderComicPdf } from "../../src/server/export/pdf-renderer";
import type {
  GeneratedImage,
  GenerationProvider,
  RenderingChoices,
  VisualInput,
} from "../../src/server/generation/contracts";
import { GenerationService } from "../../src/server/generation/generation-service";
import { ProjectStore } from "../../src/server/storage/project-store";
import { validPngBytes } from "../fixtures/generation-fixtures";

const journeyRootPrefix = "comic-creator-journey-";

async function listGlobalJourneyRoots(): Promise<string[]> {
  const entries = await fs.readdir(os.tmpdir());
  return entries
    .filter((entry) => entry.startsWith(journeyRootPrefix))
    .sort();
}

async function directoryPayloadBytes(directory: string): Promise<number> {
  let bytes = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      bytes += await directoryPayloadBytes(child);
    } else if (entry.isFile()) {
      bytes += (await fs.stat(child)).size;
    }
  }
  return bytes;
}

async function withTemporaryJourneyRoot<T>(
  run: (root: string) => Promise<T>,
  cleanup: (root: string) => Promise<void> = async (root) =>
    trash([root], { glob: false }),
): Promise<T> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), journeyRootPrefix));
  let primaryError: unknown;
  let hasPrimaryError = false;
  try {
    return await run(root);
  } catch (error) {
    primaryError = error;
    hasPrimaryError = true;
    throw error;
  } finally {
    try {
      await cleanup(root);
    } catch (cleanupError) {
      if (hasPrimaryError) {
        const primaryErrors = primaryError instanceof AggregateError
          ? primaryError.errors
          : [primaryError];
        throw new AggregateError(
          [...primaryErrors, cleanupError],
          "Comic journey and Trash cleanup both failed",
        );
      }
      throw cleanupError;
    }
  }
}

class RecordingProvider implements GenerationProvider {
  readonly calls: string[] = [];

  constructor(private readonly png: Buffer) {}

  async moderate(text: string): Promise<void> {
    this.calls.push(text);
  }

  async chooseRendering(input: VisualInput): Promise<RenderingChoices> {
    this.calls.push(JSON.stringify(input));
    return {
      shotSize: "wide",
      cameraAngle: "eye_level",
      lighting: "moonlit",
      palette: "cool",
      focus: "action",
    };
  }

  async generateHero(prompt: string): Promise<GeneratedImage> {
    this.calls.push(prompt);
    return {
      bytes: this.png,
      providerRequestId: "hero-request",
      durationMs: 1,
    };
  }

  async generatePanel(
    _referencePath: string,
    prompt: string,
  ): Promise<GeneratedImage> {
    this.calls.push(prompt);
    return {
      bytes: this.png,
      providerRequestId: "panel-request",
      durationMs: 1,
    };
  }
}

describe("complete comic journey", () => {
  it("authors, illustrates, revises, restores, paginates, and exports four panels", async () => {
    const payloadBytes = await withTemporaryJourneyRoot(async (root) => {
      const png = await validPngBytes();
      const store = new ProjectStore(root);
      const provider = new RecordingProvider(png);
      const service = new GenerationService(store, provider);
      const project = createProject({
        title: "Nova and the Moon Kite",
        localAuthorCredit: "M.",
      });
      project.hero.childDescription =
        "Nova wears a violet flight jacket and round goggles.";
      const story = [
        "Nova tests her moon kite.",
        "A storm cloud catches the kite.",
        "Nova steers through the lightning.",
        "The moon kite lights the whole block.",
      ];
      const dialogue = [
        "Tonight, I’ll touch the moon!",
        "Hold on, little kite!",
        "We can fly through this!",
        "We made our own moonlight.",
      ];
      project.beats.forEach((beat, index) => {
        beat.childText = story[index]!;
      });
      project.panels.forEach((panel, index) => {
        panel.action = `Nova directs scene ${index + 1}.`;
        panel.setting = "A city rooftop at night.";
        panel.mood = index === 1 ? "worried" : "brave";
        panel.framing = "wide";
        panel.overlays = [{
          id: `dialogue-${index + 1}`,
          kind: "dialogue",
          text: dialogue[index]!,
          speaker: "Nova",
          x: 0.06,
          y: 0.06,
          width: 0.48,
          height: 0.22,
        }];
      });
      await store.save(project);

      const hero = await service.generateHero(project.id);
      const heroCandidate = hero.hero.imageVersions.at(-1)!;
      await service.approveHero(project.id, heroCandidate.id);

      for (const [index, panel] of project.panels.entries()) {
        await service.generatePanel(project.id, panel.id, "");
        if (index === 0) {
          const firstCandidate = (await store.load(project.id)).panels[0]!
            .imageVersions.at(-1)!;
          await service.generatePanel(project.id, panel.id, "Make it moonlit");
          const newestCandidate = (await store.load(project.id)).panels[0]!
            .imageVersions.at(-1)!;
          expect(newestCandidate.id).not.toBe(firstCandidate.id);
          await service.approvePanelVersion(
            project.id,
            panel.id,
            newestCandidate.id,
          );
        } else {
          const candidate = (await store.load(project.id)).panels[index]!
            .imageVersions.at(-1)!;
          await service.approvePanelVersion(project.id, panel.id, candidate.id);
        }
      }

      const restored = await store.load(project.id);
      expect(restored.beats.map((beat) => beat.childText)).toEqual(story);
      expect(restored.panels.map((panel) => panel.overlays[0]!.text))
        .toEqual(dialogue);
      expect(restored.panels[0]!.imageVersions).toHaveLength(2);
      expect(restored.panels[0]!.imageVersions[0]!.status).toBe("rejected");
      expect(paginatePanels(restored.panels)).toHaveLength(1);

      const pdf = await renderComicPdf(
        restored,
        async (_projectId, imageId) =>
          fs.readFile(await store.resolveImageAsset(restored.id, imageId)),
      );
      expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe("%PDF-");

      const providerTranscript = provider.calls.join("\n");
      for (const exactAuthoredText of [
        project.title,
        project.localAuthorCredit,
        ...story,
        ...dialogue,
      ]) {
        expect(providerTranscript).not.toContain(exactAuthoredText);
      }

      return directoryPayloadBytes(root);
    });
    expect(payloadBytes).toBeLessThan(64 * 1024);
  });

  it("leaves no new global temporary root after success or failure", async () => {
    const before = await listGlobalJourneyRoots();
    const successfulRoot = await withTemporaryJourneyRoot(async (root) => {
      await fs.writeFile(path.join(root, "success-proof"), "success");
      return root;
    });
    let failedRoot = "";

    await expect(withTemporaryJourneyRoot(async (root) => {
      failedRoot = root;
      await fs.writeFile(path.join(root, "failure-proof"), "failure");
      throw new Error("deliberate fixture failure");
    })).rejects.toThrow("deliberate fixture failure");

    expect(await listGlobalJourneyRoots()).toEqual(before);
    await expect(fs.access(successfulRoot)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(fs.access(failedRoot)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("reports the primary and Trash cleanup failures together", async () => {
    const primaryError = new Error("deliberate primary failure");
    const cleanupError = new Error("deliberate cleanup failure");
    let received: unknown;

    try {
      await withTemporaryJourneyRoot(
        async () => {
          throw primaryError;
        },
        async (root) => {
          await trash([root], { glob: false });
          throw cleanupError;
        },
      );
    } catch (error) {
      received = error;
    }

    expect(received).toBeInstanceOf(AggregateError);
    expect((received as AggregateError).errors).toEqual([
      primaryError,
      cleanupError,
    ]);
  });
});
