import { describe, expect, it } from "vitest";
import {
  MAX_PANELS,
  addPanelToBeat,
  createProject,
} from "../../src/domain/project";

describe("addPanelToBeat", () => {
  it("inserts after the selected beat and shifts later panel orders", () => {
    const project = createProject({ title: "Five panels", localAuthorCredit: "" });
    const problem = project.beats[1]!;

    const updated = addPanelToBeat(project, problem.id, () => "problem-panel-2");
    const added = updated.panels.find((panel) => panel.id === "problem-panel-2");

    expect(updated.panels).toHaveLength(5);
    expect(problem.panelIds).toHaveLength(1);
    expect(updated.beats[1]!.panelIds).toEqual([
      project.beats[1]!.panelIds[0],
      "problem-panel-2",
    ]);
    expect(added).toEqual(expect.objectContaining({
      id: "problem-panel-2",
      beatId: problem.id,
      order: 2,
      action: "",
      setting: "",
      mood: "",
      framing: "",
      overlays: [],
      imageVersions: [],
      generationStatus: "idle",
    }));
    expect(
      [...updated.panels]
        .sort((left, right) => left.order - right.order)
        .map((panel) => panel.beatId),
    ).toEqual([
      project.beats[0]!.id,
      problem.id,
      problem.id,
      project.beats[2]!.id,
      project.beats[3]!.id,
    ]);
  });

  it("appends after every existing panel in the selected beat", () => {
    const project = createProject({ title: "Six panels", localAuthorCredit: "" });
    const setup = project.beats[0]!;
    const five = addPanelToBeat(project, setup.id, () => "setup-panel-2");
    const six = addPanelToBeat(five, setup.id, () => "setup-panel-3");

    expect(six.beats[0]!.panelIds).toEqual([
      project.beats[0]!.panelIds[0],
      "setup-panel-2",
      "setup-panel-3",
    ]);
    expect(six.panels.find((panel) => panel.id === "setup-panel-3")?.order).toBe(2);
  });

  it("enforces the canonical panel limit", () => {
    let project = createProject({ title: "Bounded panels", localAuthorCredit: "" });
    const beatId = project.beats[3]!.id;
    while (project.panels.length < MAX_PANELS) {
      const next = project.panels.length;
      project = addPanelToBeat(project, beatId, () => `extra-panel-${next}`);
    }

    expect(() =>
      addPanelToBeat(project, beatId, () => "one-too-many"),
    ).toThrow(/maximum|limit/i);
  });
});
