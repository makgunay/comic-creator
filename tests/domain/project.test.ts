import { describe, expect, it } from "vitest";
import {
  MAX_HERO_IMAGE_VERSIONS,
  MAX_OVERLAYS_PER_PANEL,
  MAX_PANEL_IMAGE_VERSIONS,
  MAX_PANELS,
  PANEL_ACTION_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
  createProject,
  ProjectSchema,
} from "../../src/domain/project";

describe("createProject", () => {
  it("creates four beats and one panel for each beat", () => {
    const project = createProject({
      title: "Nova and the Moon Kite",
      localAuthorCredit: "M.",
    });

    expect(project.beats.map((beat) => beat.type)).toEqual([
      "setup",
      "problem",
      "bigMoment",
      "ending",
    ]);
    expect(project.panels).toHaveLength(4);
    expect(project.beats.every((beat) => beat.panelIds.length === 1)).toBe(true);
    expect(ProjectSchema.parse(project)).toEqual(project);
  });

  it("accepts relative image asset keys and rejects absolute paths", () => {
    const project = createProject({ title: "Nova and the Moon Kite", localAuthorCredit: "M." });
    const version = {
      id: "image-1",
      localPath: "images/image-1.png",
      createdAt: "2026-07-20T00:00:00.000Z",
      childRevisionDirection: "",
      status: "candidate" as const,
    };

    expect(ProjectSchema.parse({
      ...project,
      hero: { ...project.hero, imageVersions: [version] },
    }).hero.imageVersions[0]?.localPath).toBe("images/image-1.png");
    expect(() => ProjectSchema.parse({
      ...project,
      hero: { ...project.hero, imageVersions: [{ ...version, localPath: "/tmp/image-1.png" }] },
    })).toThrow();
  });

  it("accepts only safe relative image asset keys", () => {
    const project = createProject({ title: "Nova and the Moon Kite", localAuthorCredit: "M." });
    const version = {
      id: "image-1",
      localPath: "images/image-1.png",
      createdAt: "2026-07-20T00:00:00.000Z",
      childRevisionDirection: "",
      status: "candidate" as const,
    };

    for (const localPath of [
      "images/../escape.png",
      "images/..",
      "images/.",
      "images/./image.png",
      "/tmp/image-1.png",
      "images\\image.png",
      "images/a/../image.png",
      "images/nested/image.png",
      "images/image",
      "images/image.jpg",
      "images/.hidden.png",
      "images/image_name.png",
      "images/image.png/extra",
    ]) {
      expect(ProjectSchema.safeParse({
        ...project,
        hero: { ...project.hero, imageVersions: [{ ...version, localPath }] },
      }).success).toBe(false);
    }
  });

  it.each([
    ["duplicate or missing required beat types", (project: ReturnType<typeof createProject>) => {
      project.beats[3]!.type = "setup";
    }],
    ["duplicate beat IDs", (project: ReturnType<typeof createProject>) => {
      project.beats[1]!.id = project.beats[0]!.id;
      project.panels[1]!.beatId = project.beats[0]!.id;
    }],
    ["empty beat panel IDs", (project: ReturnType<typeof createProject>) => {
      project.beats[0]!.panelIds = [];
    }],
    ["a panel omitted from beat membership", (project: ReturnType<typeof createProject>) => {
      project.panels.push({ ...project.panels[0]!, id: "unreferenced-panel", order: 4 });
    }],
    ["a panel referenced by two beats", (project: ReturnType<typeof createProject>) => {
      project.beats[1]!.panelIds.push(project.panels[0]!.id);
    }],
    ["a panel with a mismatched beat ID", (project: ReturnType<typeof createProject>) => {
      project.panels[0]!.beatId = project.beats[1]!.id;
    }],
    ["duplicate panel IDs", (project: ReturnType<typeof createProject>) => {
      project.panels[1]!.id = project.panels[0]!.id;
      project.beats[1]!.panelIds = [project.panels[0]!.id];
    }],
    ["duplicate panel orders", (project: ReturnType<typeof createProject>) => {
      project.panels[1]!.order = project.panels[0]!.order;
    }],
    ["a missing panel referenced by a beat", (project: ReturnType<typeof createProject>) => {
      project.beats[0]!.panelIds = ["missing-panel"];
    }],
    ["a dangling approved image version ID", (project: ReturnType<typeof createProject>) => {
      project.panels[0]!.approvedImageVersionId = "missing-image";
    }],
    ["an approved image status that does not match its approved ID", (project: ReturnType<typeof createProject>) => {
      project.panels[0]!.approvedImageVersionId = "image-1";
      project.panels[0]!.imageVersions = [{
        id: "image-1",
        localPath: "images/image-1.png",
        createdAt: "2026-07-20T00:00:00.000Z",
        childRevisionDirection: "",
        status: "candidate",
      }];
    }],
  ])("rejects %s", (_description, mutate) => {
    const project = createProject({ title: "Nova and the Moon Kite", localAuthorCredit: "M." });
    mutate(project);

    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it.each([
    ["hero and panel images", (project: ReturnType<typeof createProject>) => {
      const imageVersion = {
        id: "shared-image",
        localPath: "images/shared-image.png",
        createdAt: "2026-07-20T00:00:00.000Z",
        childRevisionDirection: "",
        status: "candidate" as const,
      };
      project.hero.imageVersions = [imageVersion];
      project.panels[0]!.imageVersions = [imageVersion];
    }],
    ["two panel image collections", (project: ReturnType<typeof createProject>) => {
      const imageVersion = {
        id: "shared-image",
        localPath: "images/shared-image.png",
        createdAt: "2026-07-20T00:00:00.000Z",
        childRevisionDirection: "",
        status: "candidate" as const,
      };
      project.panels[0]!.imageVersions = [imageVersion];
      project.panels[1]!.imageVersions = [imageVersion];
    }],
  ])("rejects duplicate image IDs across %s", (_description, mutate) => {
    const project = createProject({ title: "Nova and the Moon Kite", localAuthorCredit: "M." });
    mutate(project);

    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it("aligns persisted text bounds with the exported UI limits", () => {
    const project = createProject({
      title: "x".repeat(PROJECT_TITLE_MAX_LENGTH),
      localAuthorCredit: "M.",
    });
    project.panels[0]!.action = "x".repeat(PANEL_ACTION_MAX_LENGTH);
    expect(ProjectSchema.safeParse(project).success).toBe(true);

    project.title += "x";
    project.panels[0]!.action += "x";
    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it("rejects abusive collection sizes before persistence", () => {
    const project = createProject({ title: "Bounded", localAuthorCredit: "M." });
    project.panels[0]!.overlays = Array.from(
      { length: 5_000 },
      (_, index) => ({
        id: `overlay-${index}`,
        kind: "dialogue" as const,
        text: "x",
        x: 0,
        y: 0,
        width: .2,
        height: .2,
      }),
    );
    expect(MAX_OVERLAYS_PER_PANEL).toBeLessThan(5_000);
    expect(ProjectSchema.safeParse(project).success).toBe(false);

    const tooManyPanels = createProject({ title: "Panels", localAuthorCredit: "" });
    const source = tooManyPanels.panels.at(-1)!;
    const ending = tooManyPanels.beats.at(-1)!;
    while (tooManyPanels.panels.length <= MAX_PANELS) {
      const id = `extra-${tooManyPanels.panels.length}`;
      tooManyPanels.panels.push({
        ...source,
        id,
        order: tooManyPanels.panels.length,
        overlays: [],
        imageVersions: [],
      });
      ending.panelIds.push(id);
    }
    expect(ProjectSchema.safeParse(tooManyPanels).success).toBe(false);
  });

  it("rejects duplicate overlay IDs, mismatched image paths, and invalid references", () => {
    const duplicateOverlay = createProject({ title: "Overlay", localAuthorCredit: "" });
    duplicateOverlay.panels[0]!.overlays = [
      {
        id: "same",
        kind: "dialogue",
        text: "One",
        x: 0,
        y: 0,
        width: .2,
        height: .2,
      },
      {
        id: "same",
        kind: "caption",
        text: "Two",
        x: .2,
        y: .2,
        width: .2,
        height: .2,
      },
    ];
    expect(ProjectSchema.safeParse(duplicateOverlay).success).toBe(false);

    const mismatchedPath = createProject({ title: "Path", localAuthorCredit: "" });
    mismatchedPath.hero.imageVersions = [{
      id: "hero-one",
      localPath: "images/hero-two.png",
      createdAt: "2026-07-20T00:00:00.000Z",
      childRevisionDirection: "",
      status: "candidate",
    }];
    expect(ProjectSchema.safeParse(mismatchedPath).success).toBe(false);

    const heroSource = createProject({ title: "Hero source", localAuthorCredit: "" });
    heroSource.hero.imageVersions = [{
      id: "hero-one",
      localPath: "images/hero-one.png",
      createdAt: "2026-07-20T00:00:00.000Z",
      sourceReferenceImageId: "hero-old",
      childRevisionDirection: "",
      status: "candidate",
    }];
    expect(ProjectSchema.safeParse(heroSource).success).toBe(false);

    const danglingPanelSource = createProject({ title: "Panel source", localAuthorCredit: "" });
    danglingPanelSource.panels[0]!.imageVersions = [{
      id: "panel-one",
      localPath: "images/panel-one.png",
      createdAt: "2026-07-20T00:00:00.000Z",
      sourceReferenceImageId: "missing-hero",
      childRevisionDirection: "",
      status: "candidate",
    }];
    expect(ProjectSchema.safeParse(danglingPanelSource).success).toBe(false);
  });

  it("allows panel continuity to reference retained rejected hero history", () => {
    const project = createProject({ title: "Continuity", localAuthorCredit: "" });
    project.hero.imageVersions = [{
      id: "hero-old",
      localPath: "images/hero-old.png",
      createdAt: "2026-07-20T00:00:00.000Z",
      childRevisionDirection: "",
      status: "rejected",
    }];
    project.panels[0]!.imageVersions = [{
      id: "panel-one",
      localPath: "images/panel-one.png",
      createdAt: "2026-07-20T00:00:00.000Z",
      sourceReferenceImageId: "hero-old",
      childRevisionDirection: "",
      status: "candidate",
    }];

    expect(ProjectSchema.safeParse(project).success).toBe(true);
  });

  it("caps retained hero and panel image histories", () => {
    const version = (id: string) => ({
      id,
      localPath: `images/${id}.png`,
      createdAt: "2026-07-20T00:00:00.000Z",
      childRevisionDirection: "",
      status: "rejected" as const,
    });
    const hero = createProject({ title: "Hero history", localAuthorCredit: "" });
    hero.hero.imageVersions = Array.from(
      { length: MAX_HERO_IMAGE_VERSIONS + 1 },
      (_, index) => version(`hero-${index}`),
    );
    expect(ProjectSchema.safeParse(hero).success).toBe(false);

    const panel = createProject({ title: "Panel history", localAuthorCredit: "" });
    panel.panels[0]!.imageVersions = Array.from(
      { length: MAX_PANEL_IMAGE_VERSIONS + 1 },
      (_, index) => version(`panel-${index}`),
    );
    expect(ProjectSchema.safeParse(panel).success).toBe(false);
  });
});
