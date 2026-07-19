import { describe, expect, it } from "vitest";
import { createProject, ProjectSchema } from "../../src/domain/project";

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

    for (const localPath of ["images/../escape.png", "images/..", "/tmp/image-1.png", "images\\image.png", "images/a/../image.png"]) {
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
});
