import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createGenerationHarness,
  deferred,
  makeProjectWithApprovedPanel,
  RecordingProvider,
  validPngBytes,
} from "../fixtures/generation-fixtures";

async function entriesOrEmpty(directory: string): Promise<string[]> {
  try {
    return await fs.readdir(directory);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

describe("GenerationService", () => {
  it("adds a panel candidate without replacing the approved image", async () => {
    const project = makeProjectWithApprovedPanel();
    const { service } = await createGenerationHarness(project);

    const updated = await service.generatePanel(project.id, project.panels[0]!.id, "Make it moonlit");
    const panel = updated.panels[0]!;

    expect(panel.approvedImageVersionId).toBe("approved-old");
    expect(panel.imageVersions.at(-1)).toMatchObject({
      status: "candidate",
      childRevisionDirection: "Make it moonlit",
      sourceReferenceImageId: "hero-approved",
    });
    expect(panel.generationStatus).toBe("idle");
  });

  it("sends only VisualInput fields and omits every authored text sentinel", async () => {
    const bytes = await validPngBytes();
    const provider = new RecordingProvider(bytes);
    const project = makeProjectWithApprovedPanel();
    project.title = "SECRET TITLE SENTINEL";
    project.localAuthorCredit = "SECRET CREDIT SENTINEL";
    project.beats[0]!.childText = "SECRET STORY SENTINEL";
    project.panels[0]!.overlays = [
      {
        id: "dialogue",
        kind: "dialogue",
        text: "SECRET DIALOGUE SENTINEL",
        speaker: "SECRET SPEAKER SENTINEL",
        x: 0.06,
        y: 0.06,
        width: 0.48,
        height: 0.22,
      },
      {
        id: "caption",
        kind: "caption",
        text: "SECRET CAPTION SENTINEL",
        x: 0.06,
        y: 0.72,
        width: 0.68,
        height: 0.18,
      },
    ];
    const { service } = await createGenerationHarness(project, provider);

    await service.generatePanel(project.id, project.panels[0]!.id, "Warmer light");

    expect(provider.visualInputs).toEqual([{
      heroDescription: project.hero.childDescription,
      action: project.panels[0]!.action,
      setting: project.panels[0]!.setting,
      mood: project.panels[0]!.mood,
      framing: project.panels[0]!.framing,
      styleNotes: project.visualStyle.editedNotes,
      revisionDirection: "Warmer light",
    }]);
    const recordings = JSON.stringify(provider);
    for (const sentinel of ["SECRET TITLE", "SECRET CREDIT", "SECRET STORY", "SECRET DIALOGUE", "SECRET CAPTION", "SECRET SPEAKER"]) {
      expect(recordings).not.toContain(sentinel);
    }
  });

  it("marks generating before the provider finishes and merges completion into newer child edits", async () => {
    const gate = deferred<void>();
    const provider = new RecordingProvider(await validPngBytes(), gate);
    const project = makeProjectWithApprovedPanel();
    const { service, store } = await createGenerationHarness(project, provider);

    const generation = service.generatePanel(project.id, project.panels[0]!.id, "Closer");
    await vi.waitFor(async () => {
      expect((await store.load(project.id)).panels[0]!.generationStatus).toBe("generating");
      expect(provider.panelPrompts).toHaveLength(1);
    });
    await store.mutate(project.id, (latest) => ({
      ...latest,
      panels: latest.panels.map((panel) => panel.id === project.panels[0]!.id
        ? { ...panel, action: "Child edit made while drawing", overlays: [{
          id: "late-dialogue",
          kind: "dialogue" as const,
          text: "Still my exact words",
          x: .05,
          y: .05,
          width: .45,
          height: .2,
        }] }
        : panel),
    }));
    gate.resolve();

    const updated = await generation;
    expect(updated.panels[0]).toMatchObject({
      action: "Child edit made while drawing",
      generationStatus: "idle",
      overlays: [{ text: "Still my exact words" }],
    });
    expect(updated.panels[0]!.imageVersions.at(-1)?.status).toBe("candidate");
  });

  it("marks a failed panel retryable while preserving approvals, versions, and overlays", async () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.overlays = [{
      id: "dialogue",
      kind: "dialogue",
      text: "Keep every word",
      x: .05,
      y: .05,
      width: .45,
      height: .2,
    }];
    const { service, provider, store } = await createGenerationHarness(project);
    vi.spyOn(provider, "generatePanel").mockRejectedValueOnce(new Error("provider secret detail"));

    await expect(service.generatePanel(project.id, project.panels[0]!.id, "Night"))
      .rejects.toThrow("provider secret detail");

    expect((await store.load(project.id)).panels[0]).toMatchObject({
      generationStatus: "failed-retryable",
      approvedImageVersionId: "approved-old",
      overlays: [{ text: "Keep every word" }],
      imageVersions: project.panels[0]!.imageVersions,
    });
  });

  it("marks a panel failed when reference resolution fails after the generating write", async () => {
    const project = makeProjectWithApprovedPanel();
    const { service, store, root } = await createGenerationHarness(project);
    await fs.rename(
      store.assetPath(project.id, "hero-approved"),
      path.join(root, "moved-reference.png"),
    );

    await expect(service.generatePanel(project.id, project.panels[0]!.id, "Closer"))
      .rejects.toBeDefined();

    expect((await store.load(project.id)).panels[0]).toMatchObject({
      generationStatus: "failed-retryable",
      approvedImageVersionId: "approved-old",
    });
  });

  it("rejects simultaneous generation with a retryable busy error and releases the lock", async () => {
    const gate = deferred<void>();
    const provider = new RecordingProvider(await validPngBytes(), gate);
    const project = makeProjectWithApprovedPanel();
    const { service } = await createGenerationHarness(project, provider);

    const first = service.generatePanel(project.id, project.panels[0]!.id, "Closer");
    await vi.waitFor(() => expect(provider.panelPrompts).toHaveLength(1));
    await expect(service.generateHero(project.id)).rejects.toMatchObject({ code: "rate_limit" });
    gate.resolve();
    await first;
    await expect(service.generateHero(project.id)).resolves.toMatchObject({ id: project.id });
  });

  it("approves and rejects candidates explicitly without erasing any version", async () => {
    const project = makeProjectWithApprovedPanel();
    const { service } = await createGenerationHarness(project);

    const approvedPanel = await service.approvePanelVersion(project.id, project.panels[0]!.id, "panel-candidate");
    expect(approvedPanel.panels[0]).toMatchObject({ approvedImageVersionId: "panel-candidate" });
    expect(approvedPanel.panels[0]!.imageVersions).toEqual([
      expect.objectContaining({ id: "approved-old", status: "rejected" }),
      expect.objectContaining({ id: "panel-candidate", status: "approved" }),
    ]);

    const generated = await service.generatePanel(project.id, project.panels[0]!.id, "Day");
    const candidateId = generated.panels[0]!.imageVersions.at(-1)!.id;
    const rejected = await service.rejectPanelCandidate(project.id, project.panels[0]!.id, candidateId);
    expect(rejected.panels[0]!.approvedImageVersionId).toBe("panel-candidate");
    expect(rejected.panels[0]!.imageVersions).toContainEqual(
      expect.objectContaining({ id: candidateId, status: "rejected" }),
    );
  });

  it("reports heroReferenceChanged only when approval replaces a reference and keeps panels unchanged", async () => {
    const project = makeProjectWithApprovedPanel();
    const originalPanels = structuredClone(project.panels);
    const { service } = await createGenerationHarness(project);

    const same = await service.approveHero(project.id, "hero-candidate");
    expect(same.heroReferenceChanged).toBe(true);
    expect(same.project.panels).toEqual(originalPanels);
    expect(same.project.hero.imageVersions).toHaveLength(2);

    const noChange = await service.approveHero(project.id, "hero-candidate");
    expect(noChange.heroReferenceChanged).toBe(false);

    const generated = await service.generateHero(project.id);
    const candidateId = generated.hero.imageVersions.at(-1)!.id;
    const kept = await service.rejectHeroCandidate(project.id, candidateId);
    expect(kept.hero.approvedReferenceImageId).toBe("hero-candidate");
    expect(kept.hero.imageVersions.at(-1)).toMatchObject({ id: candidateId, status: "rejected" });
  });

  it("keeps hero moderation and prompts free of story, title, and credit", async () => {
    const project = makeProjectWithApprovedPanel();
    project.title = "TITLE SENTINEL";
    project.localAuthorCredit = "CREDIT SENTINEL";
    project.beats[0]!.childText = "STORY SENTINEL";
    const { service, provider } = await createGenerationHarness(project);

    await service.generateHero(project.id);

    const recorded = [...provider.moderations, ...provider.heroPrompts].join("\n");
    expect(recorded).toContain(project.hero.childDescription);
    expect(recorded).not.toMatch(/TITLE SENTINEL|CREDIT SENTINEL|STORY SENTINEL/);
  });

  it("rejects non-PNG output and quarantines an orphan if project mutation fails after publish", async () => {
    const project = makeProjectWithApprovedPanel();
    const invalidProvider = new RecordingProvider(Buffer.from("not an image"));
    const invalidHarness = await createGenerationHarness(project, invalidProvider);
    await expect(invalidHarness.service.generateHero(project.id)).rejects.toMatchObject({ code: "provider" });
    expect(await entriesOrEmpty(path.join(invalidHarness.root, "projects", project.id, "images")))
      .toEqual(expect.arrayContaining(["hero-approved.png", "hero-candidate.png", "approved-old.png", "panel-candidate.png"]));

    const harness = await createGenerationHarness(project);
    const originalMutate = harness.store.mutate.bind(harness.store);
    let calls = 0;
    vi.spyOn(harness.store, "mutate").mockImplementation(async (id, mutator) => {
      calls += 1;
      if (calls === 2) throw new Error("Injected mutation failure");
      return originalMutate(id, mutator);
    });
    await expect(harness.service.generatePanel(project.id, project.panels[0]!.id, "Cooler"))
      .rejects.toThrow("Injected mutation failure");

    const liveImages = await entriesOrEmpty(path.join(harness.root, "projects", project.id, "images"));
    expect(liveImages).toHaveLength(4);
    expect(await entriesOrEmpty(path.join(harness.root, "recovery"))).not.toEqual([]);
  });
});
