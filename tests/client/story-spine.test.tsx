import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StorySpine } from "../../src/client/features/story/StorySpine";
import { makeEightPanelProject, makeProject } from "../fixtures/project-fixtures";

describe("StorySpine", () => {
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
});
