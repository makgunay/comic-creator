import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StorySpine } from "../../src/client/features/story/StorySpine";
import { makeClientApi } from "../fixtures/client-api-fixtures";
import { makeEightPanelProject, makeProject } from "../fixtures/project-fixtures";

describe("StorySpine", () => {
  it("asks the AI coach for one fixed neutral question at a time", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    project.beats.forEach((beat, index) => {
      beat.childText = `Story beat ${index + 1}`;
    });
    const coachStory = vi.fn()
      .mockResolvedValueOnce({ signal: "big_moment_needs_choice" })
      .mockResolvedValueOnce({ signal: "ending_needs_resolution" });
    const api = makeClientApi(project, { coachStory });
    render(
      <StorySpine
        project={project}
        onChange={vi.fn()}
        api={api}
        configStatus="enabled"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ask for one question" }));
    expect(await screen.findByText("What choice does your hero make in the big moment?"))
      .toBeInTheDocument();
    expect(coachStory).toHaveBeenNthCalledWith(1, project.id, {});

    await user.click(screen.getByRole("button", { name: "Ask another" }));
    expect(await screen.findByText("How does the ending show what changed?"))
      .toBeInTheDocument();
    expect(coachStory).toHaveBeenNthCalledWith(2, project.id, {
      previousSignal: "big_moment_needs_choice",
    });
  });

  it("keeps AI coaching explicitly unavailable in sample mode", () => {
    const project = makeProject();
    render(
      <StorySpine
        project={project}
        onChange={vi.fn()}
        api={makeClientApi(project)}
        configStatus="disabled"
      />,
    );

    expect(screen.getByRole("button", { name: "Ask for one question" }))
      .toBeDisabled();
    expect(screen.getByText("Add an API key to ask the AI coach."))
      .toBeInTheDocument();
  });

  it("keeps every beat child-authored", async () => {
    const onChange = vi.fn();
    render(<StorySpine project={makeProject()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Setup"), {
      target: { value: "Nova tests her moon kite." },
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      beats: expect.arrayContaining([
        expect.objectContaining({
          type: "setup",
          childText: "Nova tests her moon kite.",
        }),
      ]),
    }));
  });

  it("supports a local two-author pass-the-pen handoff", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    project.localAuthorCredit = "Ari";
    project.collaboration = {
      enabled: false,
      authors: ["Ari", ""],
      activeAuthorIndex: 0,
    };
    const onChange = vi.fn();
    const view = render(<StorySpine project={project} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Write with a friend" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      collaboration: {
        enabled: true,
        authors: ["Ari", ""],
        activeAuthorIndex: 0,
      },
    }));

    const together = {
      ...project,
      collaboration: {
        enabled: true,
        authors: ["Ari", "Rowan"] as [string, string],
        activeAuthorIndex: 0 as const,
      },
      localAuthorCredit: "Ari & Rowan",
    };
    view.rerender(<StorySpine project={together} onChange={onChange} />);
    expect(screen.getByText("Ari is writing")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Writer 2"), {
      target: { value: "Mina" },
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      localAuthorCredit: "Ari & Mina",
      collaboration: expect.objectContaining({ authors: ["Ari", "Mina"] }),
    }));

    await user.click(screen.getByRole("button", { name: "Pass the pen to Rowan" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      collaboration: expect.objectContaining({ activeAuthorIndex: 1 }),
    }));
  });

  it("shows progress without points, streaks, or generated story prose", () => {
    render(<StorySpine project={makeProject()} onChange={vi.fn()} />);
    expect(screen.getByText(/Story plan ready/)).toBeInTheDocument();
    expect(screen.queryByText(/points|streak/i)).not.toBeInTheDocument();
  });

  it("renders exactly the four named story beats without imposing a panel cap", () => {
    const project = makeEightPanelProject();
    render(<StorySpine project={project} onChange={vi.fn()} />);

    expect(screen.getAllByRole("textbox")).toHaveLength(4);
    expect(screen.getByLabelText("Setup")).toBeInTheDocument();
    expect(screen.getByLabelText("Problem")).toBeInTheDocument();
    expect(screen.getByLabelText("Big Moment")).toBeInTheDocument();
    expect(screen.getByLabelText("Ending")).toBeInTheDocument();
    expect(project.panels).toHaveLength(8);
    expect(project.beats.at(-1)?.panelIds).toHaveLength(5);
  });

  it("offers an accessible per-beat control that adds panel five", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    const onChange = vi.fn();
    render(<StorySpine project={project} onChange={onChange} />);

    expect(screen.getAllByText("1 panel")).toHaveLength(4);
    await user.click(screen.getByRole("button", {
      name: "Add another panel to Problem",
    }));

    const updated = onChange.mock.calls.at(-1)?.[0];
    expect(updated.panels).toHaveLength(5);
    expect(updated.beats[1].panelIds).toHaveLength(2);
  });
});
