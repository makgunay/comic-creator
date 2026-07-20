import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
    const png = await fs.readFile(
      path.resolve("sample-assets/moon-kite/images/panel-1.png"),
    );
    const root = path.join(
      os.tmpdir(),
      "comic-creator-tests",
      `journey-${randomUUID()}`,
    );
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
  });
});
