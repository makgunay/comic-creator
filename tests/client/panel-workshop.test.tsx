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

function WorkshopHarness({ project: initial, api, saveState = "saved" as const }: {
  project: Project;
  api: ComicApi;
  saveState?: "loading" | "dirty" | "saving" | "saved" | "error";
}) {
  const [project, setProject] = useState(initial);
  return (
    <PanelWorkshop
      project={project}
      api={api}
      saveState={saveState}
      configStatus="enabled"
      onChange={setProject}
      acceptServerProject={(next) => { setProject(next); return next.id === project.id; }}
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
});

describe("PanelWorkshop", () => {
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
    expect(within(panel).getByLabelText("Dialogue")).toHaveValue("");
    expect(within(panel).getByLabelText("Caption")).toHaveValue("");
    expect(within(panel).getByLabelText("Dialogue").closest("label")).toHaveStyle({
      left: "6%",
      top: "6%",
      width: "48%",
    });
    expect(within(panel).getByLabelText("Caption").closest("label")).toHaveStyle({
      left: "8%",
      top: "76%",
      width: "84%",
    });
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
    expect(screen.getByLabelText("What happens?")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add dialogue" })).toBeDisabled();
    await act(async () => pending.resolve({ project }));
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
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-draw panel" }));
    view.unmount();

    await act(async () => pending.resolve({ project }));

    expect(acceptServerProject).not.toHaveBeenCalled();
  });
});
