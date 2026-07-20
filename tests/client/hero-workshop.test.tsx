import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroWorkshop } from "../../src/client/features/hero/HeroWorkshop";
import { makeProject } from "../fixtures/project-fixtures";

describe("HeroWorkshop", () => {
  it("keeps the hero description child-authored", async () => {
    const project = makeProject();
    const onChange = vi.fn();
    render(
      <HeroWorkshop
        project={project}
        configStatus="enabled"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("What does your hero look like?"), {
      target: { value: "Nova wears a violet jacket." },
    });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      hero: expect.objectContaining({
        childDescription: "Nova wears a violet jacket.",
      }),
    }));
  });

  it("disables generation in sample mode without rendering credential controls", () => {
    render(
      <HeroWorkshop
        project={makeProject()}
        configStatus="disabled"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Draw my hero" })).toBeDisabled();
    expect(screen.queryByText(/api key/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /key/i })).not.toBeInTheDocument();
  });

  it("never exposes an enabled drawing action before generation is wired", () => {
    const project = makeProject();
    project.hero.childDescription = "Nova wears a violet jacket and round goggles.";
    render(
      <HeroWorkshop
        project={project}
        configStatus="enabled"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Draw my hero" })).toBeDisabled();
    expect(screen.getByText("Your description saves now. The art studio opens next."))
      .toBeInTheDocument();
  });
});
