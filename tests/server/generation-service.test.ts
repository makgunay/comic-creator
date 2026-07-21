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
  it("coaches from only the four story beats after moderation", async () => {
    const project = makeProjectWithApprovedPanel();
    project.title = "PRIVATE TITLE";
    project.localAuthorCredit = "PRIVATE CHILD NAME";
    project.beats[0]!.childText = "Mira walks in the forest.";
    project.beats[1]!.childText = "Her dog runs away.";
    project.beats[2]!.childText = "Mira follows the path.";
    project.beats[3]!.childText = "They find each other.";
    project.panels[0]!.action = "PRIVATE PANEL DIRECTION";
    const { service, provider } = await createGenerationHarness(project);

    await expect(service.coachStory(project.id)).resolves.toEqual({
      signal: "big_moment_needs_choice",
    });

    expect(provider.coachInputs).toEqual([{
      setup: project.beats[0]!.childText,
      problem: project.beats[1]!.childText,
      bigMoment: project.beats[2]!.childText,
      ending: project.beats[3]!.childText,
    }]);
    expect(provider.moderations).toEqual([
      project.beats.map((beat) => beat.childText).join("\n"),
    ]);
    expect(JSON.stringify(provider.coachInputs)).not.toMatch(
      /PRIVATE TITLE|PRIVATE CHILD NAME|PRIVATE PANEL DIRECTION/,
    );
  });

  it("passes the prior coach signal without persisting a transcript", async () => {
    const project = makeProjectWithApprovedPanel();
    project.beats.forEach((beat, index) => {
      beat.childText = `Beat ${index + 1}`;
    });
    const { service, provider, store } = await createGenerationHarness(project);
    const before = await store.load(project.id);

    await service.coachStory(project.id, "setup_needs_setting");

    expect(provider.coachInputs[0]).toMatchObject({
      previousSignal: "setup_needs_setting",
    });
    expect(await store.load(project.id)).toEqual(before);
  });

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

  it("marks opt-in lettered candidates and sends only the current exact overlay copy", async () => {
    const bytes = await validPngBytes();
    const provider = new RecordingProvider(bytes);
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.overlays = [{
      id: "dialogue",
      kind: "dialogue",
      text: "My exact line!",
      x: .1,
      y: .15,
      width: .4,
      height: .2,
    }];
    const { service } = await createGenerationHarness(project, provider);

    const updated = await service.generatePanel(
      project.id,
      project.panels[0]!.id,
      "",
      true,
    );

    expect(updated.panels[0]!.imageVersions.at(-1)).toMatchObject({
      status: "candidate",
      letteringMode: "embedded",
    });
    expect(provider.panelPrompts[0]).toContain(JSON.stringify("My exact line!"));
    expect(provider.moderations.join("\n")).toContain("My exact line!");
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

  it("resolves every older active candidate when approving the newest panel and hero versions", async () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.imageVersions.push(
      {
        ...project.panels[0]!.imageVersions[1]!,
        id: "panel-candidate-b",
        localPath: "images/panel-candidate-b.png",
      },
    );
    project.hero.imageVersions.push(
      {
        ...project.hero.imageVersions[1]!,
        id: "hero-candidate-b",
        localPath: "images/hero-candidate-b.png",
      },
    );
    const { service } = await createGenerationHarness(project);

    const panelApproved = await service.approvePanelVersion(
      project.id,
      project.panels[0]!.id,
      "panel-candidate-b",
    );
    expect(panelApproved.panels[0]!.imageVersions.map(({ id, status }) => ({ id, status })))
      .toEqual([
        { id: "approved-old", status: "rejected" },
        { id: "panel-candidate", status: "rejected" },
        { id: "panel-candidate-b", status: "approved" },
      ]);

    const heroApproved = await service.approveHero(project.id, "hero-candidate-b");
    expect(heroApproved.project.hero.imageVersions.map(({ id, status }) => ({ id, status })))
      .toEqual([
        { id: "hero-approved", status: "rejected" },
        { id: "hero-candidate", status: "rejected" },
        { id: "hero-candidate-b", status: "approved" },
      ]);
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
    project.panels[0]!.action = "ACTION SENTINEL";
    project.panels[0]!.setting = "SETTING SENTINEL";
    project.panels[0]!.overlays = [{
      id: "overlay-sentinel",
      kind: "dialogue",
      text: "OVERLAY SENTINEL",
      x: .05,
      y: .05,
      width: .45,
      height: .2,
    }];
    const { service, provider } = await createGenerationHarness(project);
    const moderate = vi.spyOn(provider, "moderate");
    const chooseRendering = vi.spyOn(provider, "chooseRendering");
    const generateHero = vi.spyOn(provider, "generateHero");

    await service.generateHero(project.id);

    expect(moderate).toHaveBeenCalledTimes(1);
    expect(chooseRendering).toHaveBeenCalledWith({
      heroDescription: project.hero.childDescription,
      action: "",
      setting: "",
      mood: "",
      framing: "full-body character reference",
      styleNotes: project.visualStyle.editedNotes,
      revisionDirection: "",
    });
    expect(moderate.mock.invocationCallOrder[0]).toBeLessThan(
      chooseRendering.mock.invocationCallOrder[0]!,
    );
    expect(chooseRendering.mock.invocationCallOrder[0]).toBeLessThan(
      generateHero.mock.invocationCallOrder[0]!,
    );
    const recorded = [...provider.moderations, ...provider.heroPrompts].join("\n");
    expect(provider.heroPrompts[0]!.split(project.hero.childDescription)).toHaveLength(2);
    expect(provider.heroPrompts[0]!.split(project.visualStyle.editedNotes)).toHaveLength(2);
    expect(provider.heroPrompts[0]).toContain(
      "wide shot, eye_level angle, moonlit lighting, cool palette, focus on action.",
    );
    expect(provider.heroPrompts[0]).toContain(
      "No text, letters, speech bubbles, logos, watermarks, extra characters, plot events, or story settings.",
    );
    expect(recorded).not.toMatch(
      /TITLE SENTINEL|CREDIT SENTINEL|STORY SENTINEL|ACTION SENTINEL|SETTING SENTINEL|OVERLAY SENTINEL/,
    );
  });

  it("does not call the hero image provider or publish a candidate when compiler output is invalid", async () => {
    const project = makeProjectWithApprovedPanel();
    const { service, provider, store } = await createGenerationHarness(project);
    const originalVersions = structuredClone(project.hero.imageVersions);
    vi.spyOn(provider, "chooseRendering").mockResolvedValueOnce({
      shotSize: "wide",
      cameraAngle: "eye_level",
      lighting: "moonlit",
      palette: "cool",
      focus: "action",
      plotAddition: "A dragon arrives",
    } as never);
    const generateHero = vi.spyOn(provider, "generateHero");

    await expect(service.generateHero(project.id)).rejects.toThrow();

    expect(generateHero).not.toHaveBeenCalled();
    expect((await store.load(project.id)).hero.imageVersions).toEqual(originalVersions);

    await expect(service.generateHero(project.id)).resolves.toMatchObject({ id: project.id });
    expect(generateHero).toHaveBeenCalledTimes(1);
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
