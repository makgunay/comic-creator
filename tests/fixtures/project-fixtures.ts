import { createProject, type ImageVersion, type Panel } from "../../src/domain/project";

export function makeProject() {
  return createProject({ title: "Test Comic", localAuthorCredit: "T." });
}

export function makePanel(overrides: Partial<Panel> = {}): Panel {
  const panel = makeProject().panels[0]!;
  return { ...panel, ...overrides } as Panel;
}

export function makeImageVersion(overrides: Partial<ImageVersion> = {}): ImageVersion {
  return {
    id: "image-1",
    localPath: "images/image-1.png",
    createdAt: "2026-07-20T00:00:00.000Z",
    childRevisionDirection: "",
    status: "candidate",
    ...overrides,
  };
}

export function makeProjectWithDialogue(text: string) {
  const project = makeProject();
  project.panels[0]!.overlays = [{
    id: "dialogue-1",
    kind: "dialogue",
    text,
    x: 0.06,
    y: 0.06,
    width: 0.48,
    height: 0.22,
  }];
  return project;
}

export function makeEightPanelProject() {
  const project = makeProject();
  const ending = project.beats.find((beat) => beat.type === "ending")!;
  const source = project.panels.at(-1)!;
  const extra = Array.from({ length: 4 }, (_, index) => ({
    ...source,
    id: `extra-panel-${index + 1}`,
    order: index + 4,
    overlays: [],
    imageVersions: [],
  }));
  ending.panelIds.push(...extra.map((panel) => panel.id));
  project.panels.push(...extra);
  return project;
}
