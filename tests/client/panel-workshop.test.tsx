import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComicApi } from "../../src/client/api/client";
import { PanelCanvas } from "../../src/client/features/panels/PanelCanvas";
import { PanelWorkshop } from "../../src/client/features/panels/PanelWorkshop";
import type { Project } from "../../src/domain/project";
import { makeClientApi } from "../fixtures/client-api-fixtures";
import { deferred, makeProjectWithApprovedPanel } from "../fixtures/generation-fixtures";
import { makeEightPanelProject, makeImageVersion, makePanel } from "../fixtures/project-fixtures";

function WorkshopHarness({
  project: initial,
  api,
  saveState = "saved" as const,
  configStatus = "enabled" as const,
}: {
  project: Project;
  api: ComicApi;
  saveState?: "loading" | "dirty" | "saving" | "saved" | "error";
  configStatus?: "loading" | "enabled" | "disabled" | "error";
}) {
  const [project, setProject] = useState(initial);
  return (
    <PanelWorkshop
      project={project}
      api={api}
      saveState={saveState}
      configStatus={configStatus}
      onChange={setProject}
      acceptServerProject={(next) => { setProject(next); return next.id === project.id; }}
      onNextToPremiere={vi.fn()}
    />
  );
}

describe("PanelCanvas", () => {
  it("renders exact editable overlays over a decorative image", () => {
    const panel = makePanel({
      action: "Nova lifts the kite.",
      setting: "A rooftop.",
      overlays: [
        { id: "d", kind: "dialogue", text: "Exact dialogue!", speaker: "Nova", x: .05, y: .05, width: .45, height: .2 },
        { id: "c", kind: "caption", text: "Exact caption.", x: .1, y: .75, width: .7, height: .15 },
      ],
    });
    const onOverlayChange = vi.fn();
    render(<PanelCanvas panel={panel} imageUrl="/member.png" onOverlayChange={onOverlayChange} />);

    expect(screen.getByRole("presentation")).toHaveAttribute("alt", "");
    expect(screen.getByDisplayValue("Exact dialogue!")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Exact caption.")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Exact dialogue!"), { target: { value: "Byte-for-byte edit" } });
    expect(onOverlayChange).toHaveBeenCalledWith("d", "Byte-for-byte edit");
  });

  it("centers short copy, compacts longer copy, and exposes remove controls", () => {
    const panel = makePanel({
      overlays: [
        { id: "short", kind: "dialogue", text: "Hello!", x: .05, y: .05, width: .45, height: .2 },
        { id: "long", kind: "dialogue", text: "First line\nSecond line\nThird line\nFourth line", x: .5, y: .05, width: .45, height: .2 },
      ],
    });
    const onOverlayRemove = vi.fn();
    render(
      <PanelCanvas
        panel={panel}
        onOverlayChange={vi.fn()}
        onOverlayRemove={onOverlayRemove}
        onOverlayMove={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Dialogue 1")).toHaveAttribute("rows", "1");
    expect(screen.getByLabelText("Dialogue 1").closest(".text-overlay")).toHaveAttribute(
      "data-text-density",
      "roomy",
    );
    expect(screen.getByLabelText("Dialogue 2")).toHaveAttribute("rows", "4");
    expect(screen.getByLabelText("Dialogue 2").closest(".text-overlay")).toHaveAttribute(
      "data-text-density",
      "compact",
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Dialogue 1" }));
    expect(onOverlayRemove).toHaveBeenCalledWith("short");
  });

  it("drags overlays in normalized coordinates and clamps them inside the art", () => {
    const panel = makePanel({
      overlays: [
        { id: "d", kind: "dialogue", text: "Move me", x: .05, y: .05, width: .45, height: .2 },
      ],
    });
    const onOverlayMove = vi.fn();
    render(
      <PanelCanvas
        panel={panel}
        onOverlayChange={vi.fn()}
        onOverlayRemove={vi.fn()}
        onOverlayMove={onOverlayMove}
      />,
    );
    const canvas = screen.getByLabelText("Panel 1 preview");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 500,
      width: 1000, height: 500, toJSON: () => ({}),
    });
    const handle = screen.getByRole("button", { name: "Move Dialogue 1" });

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1200, clientY: 600 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 1200, clientY: 600 });

    expect(onOverlayMove).toHaveBeenCalledWith("d", { x: .55, y: .8 });
  });

  it("hides duplicate local boxes for embedded lettering until editing is requested", async () => {
    const panel = makePanel({
      overlays: [
        { id: "d", kind: "dialogue", text: "Already in the art", x: .05, y: .05, width: .45, height: .2 },
      ],
    });
    const user = userEvent.setup();
    render(
      <PanelCanvas
        panel={panel}
        hasEmbeddedLettering
        onOverlayChange={vi.fn()}
        onOverlayRemove={vi.fn()}
        onOverlayMove={vi.fn()}
      />,
    );

    expect(screen.queryByDisplayValue("Already in the art")).not.toBeInTheDocument();
    expect(screen.getByText(/artwork contains its own lettering/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit word boxes" }));
    expect(screen.getByDisplayValue("Already in the art")).toBeInTheDocument();
  });
});

describe("PanelWorkshop", () => {
  it("reveals panel work in three child-friendly steps and delays revision controls", () => {
    const approvedProject = makeProjectWithApprovedPanel();
    const api = makeClientApi(approvedProject);
    const view = render(<WorkshopHarness project={approvedProject} api={api} />);

    expect(screen.getByRole("heading", { name: "1. Set the scene" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. Add your words" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3. Draw and choose" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Make changes" })).toBeInTheDocument();
    expect(screen.getByText(/follows your Setup moment/i)).toBeInTheDocument();

    const firstDraft = structuredClone(approvedProject);
    delete firstDraft.panels[0]!.approvedImageVersionId;
    firstDraft.panels[0]!.imageVersions = [];
    view.rerender(<WorkshopHarness key="first-draft" project={firstDraft} api={makeClientApi(firstDraft)} />);
    expect(screen.queryByRole("heading", { name: "Make changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Quick visual changes" })).not.toBeInTheDocument();
  });

  it("keeps words-in-art as an advanced experiment without model jargon", async () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.overlays = [
      { id: "d", kind: "dialogue", text: "Exact words", x: .1, y: .1, width: .4, height: .2 },
    ];
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    expect(screen.getByText("Try words inside the artwork").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByText(/GPT Image|model/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Panel 1 ready/)).toBeInTheDocument();
  });

  it("keeps stale embedded art distinct and asks for a redraw after word-box edits", async () => {
    const project = makeProjectWithApprovedPanel();
    const generatedOverlay = {
      id: "d",
      kind: "dialogue" as const,
      text: "Words inside the art",
      x: .1,
      y: .1,
      width: .4,
      height: .2,
    };
    project.panels[0]!.overlays = [{ ...generatedOverlay, text: "Edited exact words" }];
    Object.assign(project.panels[0]!.imageVersions[0]!, {
      letteringMode: "embedded" as const,
      letteringSnapshot: [generatedOverlay],
    });
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    expect(screen.queryByDisplayValue("Edited exact words")).not.toBeInTheDocument();
    expect(screen.getByText(/artwork contains its own lettering/i)).toBeInTheDocument();
    expect(screen.getByText(/edit.*re-draw/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit word boxes" }));
    expect(screen.getByDisplayValue("Edited exact words")).toBeInTheDocument();
  });

  it("sorts and navigates more than four panels with beat and Panel N of M labels", async () => {
    const project = makeEightPanelProject();
    project.panels.reverse();
    const api = makeClientApi(project);
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={api} />);

    expect(screen.getByRole("heading", { name: "Direct panel 1" })).toBeInTheDocument();
    expect(screen.getAllByText("Panel 1 of 8")).toHaveLength(2);
    expect(screen.getByText("Setup")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next: Panel 2" }));
    expect(screen.getByRole("heading", { name: "Direct panel 2" })).toBeInTheDocument();
    expect(screen.getAllByText("Panel 2 of 8")).toHaveLength(2);
  });

  it("adds dialogue and caption overlays with normalized deterministic defaults", async () => {
    const project = makeProjectWithApprovedPanel();
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    await user.click(screen.getByRole("button", { name: "Add dialogue" }));
    await user.click(screen.getByRole("button", { name: "Add caption" }));

    const panel = screen.getByLabelText("Panel 1 preview");
    expect(within(panel).getByLabelText("Dialogue 1")).toHaveValue("");
    expect(within(panel).getByLabelText("Caption 1")).toHaveValue("");
    expect(within(panel).getByLabelText("Dialogue 1").closest(".text-overlay")).toHaveStyle({
      left: "6%",
      top: "6%",
      width: "48%",
    });
    expect(within(panel).getByLabelText("Caption 1").closest(".text-overlay")).toHaveStyle({
      left: "8%",
      top: "76%",
      width: "84%",
    });
  });

  it("removes dialogue and captions without disturbing the remaining boxes", async () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.overlays = [
      { id: "keep", kind: "dialogue", text: "Keep", x: .1, y: .1, width: .4, height: .2 },
      { id: "remove", kind: "caption", text: "Remove", x: .1, y: .7, width: .8, height: .15 },
    ];
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    await user.click(screen.getByRole("button", { name: "Remove Caption 1" }));
    expect(screen.queryByDisplayValue("Remove")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Keep").closest(".text-overlay")).toHaveStyle({
      left: "10%",
      top: "10%",
    });
  });

  it("offers child-friendly camera choices and maps legacy wide framing", async () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.framing = "wide";
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    const camera = screen.getByRole("combobox", { name: "Camera view" });
    expect(camera).toHaveDisplayValue("Whole scene");
    expect(within(camera).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Let the illustrator choose",
      "Whole scene",
      "Character and action",
      "Face and feelings",
      "Looking down",
      "Looking up",
    ]);
    await user.selectOptions(camera, "face-and-feelings");
    expect(camera).toHaveDisplayValue("Face and feelings");
    expect(screen.getByText(/fill the panel with a face and expression/i)).toBeInTheDocument();
  });

  it("sends the lettering experiment only when exact authored words exist", async () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.overlays = [
      { id: "d", kind: "dialogue", text: "Exact words", x: .1, y: .1, width: .4, height: .2 },
    ];
    const generatePanel = vi.fn().mockResolvedValue({ project });
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={makeClientApi(project, { generatePanel })} />);

    await user.click(screen.getByText("Try words inside the artwork"));
    await user.click(screen.getByRole("checkbox", { name: /letter my words inside the artwork/i }));
    await user.click(screen.getByRole("button", { name: "Re-draw panel" }));
    expect(generatePanel).toHaveBeenCalledWith(project.id, project.panels[0]!.id, {
      revisionDirection: "",
      embeddedLettering: true,
    });
  });

  it("gives repeated overlays distinguishable labels and non-overlapping deterministic geometry", async () => {
    const project = makeProjectWithApprovedPanel();
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    await user.click(screen.getByRole("button", { name: "Add dialogue" }));
    await user.click(screen.getByRole("button", { name: "Add dialogue" }));
    await user.click(screen.getByRole("button", { name: "Add caption" }));
    await user.click(screen.getByRole("button", { name: "Add caption" }));

    const preview = screen.getByLabelText("Panel 1 preview");
    const dialogue1 = within(preview).getByLabelText("Dialogue 1").closest(".text-overlay")!;
    const dialogue2 = within(preview).getByLabelText("Dialogue 2").closest(".text-overlay")!;
    const caption1 = within(preview).getByLabelText("Caption 1").closest(".text-overlay")!;
    const caption2 = within(preview).getByLabelText("Caption 2").closest(".text-overlay")!;
    expect(dialogue1).toHaveStyle({ left: "4%", top: "6%", width: "44%" });
    expect(dialogue2).toHaveStyle({ left: "52%", top: "6%", width: "44%" });
    expect(caption1).toHaveStyle({ top: "64%", minHeight: "15%" });
    expect(caption2).toHaveStyle({ top: "81%", minHeight: "15%" });
  });

  it("offers exactly the required quick chips and sends chips or custom direction", async () => {
    const project = makeProjectWithApprovedPanel();
    const generatePanel = vi.fn().mockResolvedValue({ project });
    const api = makeClientApi(project, { generatePanel });
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={api} />);

    const group = screen.getByRole("group", { name: "Quick visual changes" });
    expect(within(group).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Closer", "Wider", "More expressive", "Night", "Day", "Warmer", "Cooler",
    ]);
    await user.click(within(group).getByRole("button", { name: "Night" }));
    await user.click(screen.getByRole("button", { name: "Re-draw panel" }));
    expect(generatePanel).toHaveBeenLastCalledWith(project.id, project.panels[0]!.id, {
      revisionDirection: "Night",
    });

    await user.click(within(group).getByRole("button", { name: "Warmer" }));
    await user.type(screen.getByLabelText("Tell your illustrator what to change"), "Move the kite higher");
    await user.click(screen.getByRole("button", { name: "Re-draw panel" }));
    expect(generatePanel).toHaveBeenLastCalledWith(project.id, project.panels[0]!.id, {
      revisionDirection: "Warmer: Move the kite higher",
    });
  });

  it("requires confirmed save, disables editing while drawing, and shows an honest wait", async () => {
    const project = makeProjectWithApprovedPanel();
    const pending = deferred<{ project: Project }>();
    const api = makeClientApi(project, { generatePanel: vi.fn().mockReturnValue(pending.promise) });
    const view = render(<WorkshopHarness project={project} api={api} saveState="dirty" />);
    expect(screen.getByRole("button", { name: "Re-draw panel" })).toBeDisabled();

    view.rerender(<WorkshopHarness project={project} api={api} saveState="saved" />);
    fireEvent.click(screen.getByRole("button", { name: "Re-draw panel" }));
    expect(screen.getByText(/around half a minute/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-draw panel" })).toHaveAccessibleDescription(
      /drawing your panel now.*editing and navigation stay locked/i,
    );
    expect(screen.getByLabelText("What happens?")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add dialogue" })).toBeDisabled();
    await act(async () => pending.resolve({ project }));
  });

  it("explains configuration and unsaved-state drawing gates visibly", () => {
    const project = makeProjectWithApprovedPanel();
    const api = makeClientApi(project);
    const view = render(
      <WorkshopHarness project={project} api={api} configStatus="loading" />,
    );
    const draw = () => screen.getByRole("button", { name: "Re-draw panel" });

    expect(draw()).toHaveAccessibleDescription(/checking the art studio/i);
    expect(screen.getByText(/checking the art studio/i)).toBeVisible();

    view.rerender(
      <WorkshopHarness project={project} api={api} configStatus="disabled" />,
    );
    expect(draw()).toHaveAccessibleDescription(/sample mode/i);

    view.rerender(
      <WorkshopHarness project={project} api={api} configStatus="error" />,
    );
    expect(draw()).toHaveAccessibleDescription(/could not be checked/i);

    view.rerender(
      <WorkshopHarness project={project} api={api} saveState="dirty" />,
    );
    expect(draw()).toHaveAccessibleDescription(/changes are still saving/i);
  });

  it("explains every authored prerequisite and the ready state", () => {
    const base = makeProjectWithApprovedPanel();
    const api = makeClientApi(base);
    const missingHero = structuredClone(base);
    delete missingHero.hero.approvedReferenceImageId;
    missingHero.hero.imageVersions = missingHero.hero.imageVersions.map((version) => ({
      ...version,
      status: "candidate" as const,
    }));
    const view = render(<WorkshopHarness key="missing-hero" project={missingHero} api={api} />);
    const draw = () => screen.getByRole("button", { name: /draw panel/i });

    expect(draw()).toHaveAccessibleDescription(
      /approve a hero first.*go to hero.*use that version/i,
    );

    const missingAction = structuredClone(base);
    missingAction.panels[0]!.action = "";
    view.rerender(<WorkshopHarness key="missing-action" project={missingAction} api={api} />);
    expect(draw()).toHaveAccessibleDescription(/describe what happens/i);

    const missingSetting = structuredClone(base);
    missingSetting.panels[0]!.setting = "";
    view.rerender(<WorkshopHarness key="missing-setting" project={missingSetting} api={api} />);
    expect(draw()).toHaveAccessibleDescription(/describe where they are/i);

    view.rerender(<WorkshopHarness key="ready" project={base} api={api} />);
    expect(draw()).toBeEnabled();
    expect(draw()).toHaveAccessibleDescription(/ready to re-draw/i);
  });

  it("shows approved and newest candidate with explicit keep/use choices", async () => {
    const project = makeProjectWithApprovedPanel();
    const rejectPanelCandidate = vi.fn().mockResolvedValue({ project });
    const approvePanelVersion = vi.fn().mockResolvedValue({ project });
    const api = makeClientApi(project, { rejectPanelCandidate, approvePanelVersion });
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={api} />);

    expect(screen.getByText("Current (approved)")).toBeInTheDocument();
    expect(screen.getByText("Newest candidate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep current" }));
    expect(rejectPanelCandidate).toHaveBeenCalledWith(
      project.id,
      project.panels[0]!.id,
      "panel-candidate",
    );
    await user.click(screen.getByRole("button", { name: "Use this version" }));
    expect(approvePanelVersion).toHaveBeenCalledWith(
      project.id,
      project.panels[0]!.id,
      "panel-candidate",
    );
  });

  it("keeps current image and text visible after a retryable generation failure", async () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.overlays = [{ id: "d", kind: "dialogue", text: "Do not lose me", x: .05, y: .05, width: .45, height: .2 }];
    const api = makeClientApi(project, {
      generatePanel: vi.fn().mockRejectedValue(new Error("raw provider detail")),
      imageUrl: vi.fn(() => "/approved.png"),
    });
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={api} />);

    await user.click(screen.getByRole("button", { name: "Re-draw panel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not finish|try again/i);
    expect(screen.getByDisplayValue("Do not lose me")).toBeInTheDocument();
    expect(screen.getAllByRole("presentation")[0]).toHaveAttribute("src", "/approved.png");
  });

  it("uses the newest candidate even when versions contain earlier rejected alternatives", () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.imageVersions = [
      makeImageVersion({ id: "old-rejected", localPath: "images/old-rejected.png", status: "rejected", createdAt: "2026-07-19T00:00:00.000Z" }),
      ...project.panels[0]!.imageVersions,
    ];
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);
    expect(screen.getByText("Newest candidate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use this version" })).toBeEnabled();
  });

  it("does not resurface resolved candidates after an approval response", () => {
    const project = makeProjectWithApprovedPanel();
    project.panels[0]!.approvedImageVersionId = "panel-candidate";
    project.panels[0]!.imageVersions = project.panels[0]!.imageVersions.map((version) => ({
      ...version,
      status: version.id === "panel-candidate" ? "approved" as const : "rejected" as const,
    }));
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    expect(screen.getByText("Current (approved)")).toBeInTheDocument();
    expect(screen.queryByText("Newest candidate")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use this version" })).not.toBeInTheDocument();
  });

  it("clears quick direction, custom direction, and notices when changing panels", async () => {
    const project = makeProjectWithApprovedPanel();
    const api = makeClientApi(project, {
      generatePanel: vi.fn().mockResolvedValue({ project }),
    });
    const user = userEvent.setup();
    render(<WorkshopHarness project={project} api={api} />);

    await user.click(screen.getByRole("button", { name: "Re-draw panel" }));
    expect(await screen.findByText(/newest candidate is ready/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Night" }));
    await user.type(
      screen.getByLabelText("Tell your illustrator what to change"),
      "Move the kite higher",
    );
    await user.click(screen.getByRole("button", { name: "Next: Panel 2" }));

    expect(screen.queryByLabelText("Tell your illustrator what to change")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Night" })).not.toBeInTheDocument();
    expect(screen.queryByText(/newest candidate is ready/i)).not.toBeInTheDocument();
  });

  it("truthfully labels candidate dismissal when there is no approved current panel", () => {
    const project = makeProjectWithApprovedPanel();
    delete project.panels[0]!.approvedImageVersionId;
    project.panels[0]!.imageVersions = [
      makeImageVersion({
        id: "only-candidate",
        localPath: "images/only-candidate.png",
        status: "candidate",
      }),
    ];
    render(<WorkshopHarness project={project} api={makeClientApi(project)} />);

    expect(screen.getByRole("button", { name: "Dismiss candidate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Keep current" })).not.toBeInTheDocument();
  });

  it("does not announce candidate readiness when the server project is not accepted", async () => {
    const project = makeProjectWithApprovedPanel();
    const api = makeClientApi(project, {
      generatePanel: vi.fn().mockResolvedValue({ project }),
    });
    render(
      <PanelWorkshop
        project={project}
        api={api}
        saveState="saved"
        configStatus="enabled"
        onChange={vi.fn()}
        acceptServerProject={() => false}
        onNextToPremiere={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Re-draw panel" }));
    await act(async () => {});

    expect(screen.queryByText(/newest candidate is ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/around half a minute/i)).not.toBeInTheDocument();
  });

  it("ignores a long generation completion after unmount", async () => {
    const project = makeProjectWithApprovedPanel();
    const pending = deferred<{ project: Project }>();
    const acceptServerProject = vi.fn(() => true);
    const view = render(
      <PanelWorkshop
        project={project}
        api={makeClientApi(project, { generatePanel: vi.fn().mockReturnValue(pending.promise) })}
        saveState="saved"
        configStatus="enabled"
        onChange={vi.fn()}
        acceptServerProject={acceptServerProject}
        onNextToPremiere={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-draw panel" }));
    view.unmount();

    await act(async () => pending.resolve({ project }));

    expect(acceptServerProject).not.toHaveBeenCalled();
  });
});
