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
});
