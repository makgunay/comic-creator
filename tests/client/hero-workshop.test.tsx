import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HeroWorkshop } from "../../src/client/features/hero/HeroWorkshop";
import type { Project } from "../../src/domain/project";
import type { ComicApi } from "../../src/client/api/client";
import { makeClientApi } from "../fixtures/client-api-fixtures";
import { deferred, makeProjectWithApprovedPanel } from "../fixtures/generation-fixtures";
import { makeImageVersion, makeProject } from "../fixtures/project-fixtures";

function Harness({ project: initial, api, saveState = "saved" as const }: {
  project: Project;
  api: ComicApi;
  saveState?: "loading" | "dirty" | "saving" | "saved" | "error";
}) {
  const [project, setProject] = useState(initial);
  return (
    <HeroWorkshop
      project={project}
      configStatus="enabled"
      saveState={saveState}
      api={api}
      onChange={setProject}
      acceptServerProject={(next) => { setProject(next); return next.id === project.id; }}
    />
  );
}

describe("HeroWorkshop", () => {
  it("keeps the hero description child-authored", async () => {
    const project = makeProject();
    const onChange = vi.fn();
    render(
      <HeroWorkshop
        project={project}
        configStatus="enabled"
        saveState="saved"
        api={makeClientApi(project)}
        onChange={onChange}
        acceptServerProject={() => true}
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
        saveState="saved"
        api={makeClientApi(makeProject())}
        onChange={vi.fn()}
        acceptServerProject={() => true}
      />,
    );

    expect(screen.getByRole("button", { name: "Draw my hero" })).toBeDisabled();
    expect(screen.queryByText(/api key/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /key/i })).not.toBeInTheDocument();
  });

  it("enables the real drawing action only for enabled config, nonempty description, and confirmed save", () => {
    const project = makeProject();
    project.hero.childDescription = "Nova wears a violet jacket and round goggles.";
    const view = render(<Harness project={project} api={makeClientApi(project)} saveState="dirty" />);

    expect(screen.getByRole("button", { name: "Draw my hero" })).toBeDisabled();
    view.rerender(<Harness project={project} api={makeClientApi(project)} saveState="saved" />);
    expect(screen.getByRole("button", { name: "Draw my hero" })).toBeEnabled();
  });

  it("shows an honest hero wait and disables editing while generation is active", async () => {
    const project = makeProject();
    project.hero.childDescription = "Nova wears a violet jacket and round goggles.";
    const pending = deferred<{ project: Project }>();
    const api = makeClientApi(project, { generateHero: vi.fn().mockReturnValue(pending.promise) });
    render(<Harness project={project} api={api} />);

    fireEvent.click(screen.getByRole("button", { name: "Draw my hero" }));
    expect(screen.getByText(/around half a minute/i)).toBeInTheDocument();
    expect(screen.getByLabelText("What does your hero look like?")).toBeDisabled();
    await act(async () => pending.resolve({ project }));
  });

  it("shows current and newest candidate with explicit approval and keep-current actions", async () => {
    const project = makeProjectWithApprovedPanel();
    const approveHero = vi.fn().mockResolvedValue({ project, heroReferenceChanged: true });
    const rejectHeroCandidate = vi.fn().mockResolvedValue({ project });
    const api = makeClientApi(project, { approveHero, rejectHeroCandidate });
    const user = userEvent.setup();
    render(<Harness project={project} api={api} />);

    expect(screen.getByText("Current hero")).toBeInTheDocument();
    expect(screen.getByText("Newest candidate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this version" }));
    expect(approveHero).toHaveBeenCalledWith(project.id, "hero-candidate");
    expect(await screen.findByRole("status")).toHaveTextContent(
      /existing panels stay unchanged.*future panels/i,
    );

    await user.click(screen.getByRole("button", { name: "Keep current" }));
    expect(rejectHeroCandidate).toHaveBeenCalledWith(project.id, "hero-candidate");
  });

  it("shows generated project artwork through validated image URLs", () => {
    const project = makeProject();
    project.hero.childDescription = "Nova";
    project.hero.approvedReferenceImageId = "hero-approved";
    project.hero.imageVersions = [makeImageVersion({
      id: "hero-approved",
      localPath: "images/hero-approved.png",
      status: "approved",
    })];
    const imageUrl = vi.fn(() => "/api/member-image.png");
    render(<Harness project={project} api={makeClientApi(project, { imageUrl })} />);

    expect(screen.getAllByRole("presentation")[0]).toHaveAttribute("src", "/api/member-image.png");
    expect(imageUrl).toHaveBeenCalledWith(project.id, "hero-approved");
  });

  it("truthfully labels candidate dismissal when no current hero is approved", () => {
    const project = makeProject();
    project.hero.childDescription = "Nova";
    project.hero.imageVersions = [makeImageVersion({
      id: "only-candidate",
      localPath: "images/only-candidate.png",
      status: "candidate",
    })];
    render(<Harness project={project} api={makeClientApi(project)} />);

    expect(screen.getByRole("button", { name: "Dismiss candidate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Keep current" })).not.toBeInTheDocument();
  });

  it("does not announce a candidate when the server project is not accepted", async () => {
    const project = makeProject();
    project.hero.childDescription = "Nova";
    render(
      <HeroWorkshop
        project={project}
        configStatus="enabled"
        saveState="saved"
        api={makeClientApi(project, { generateHero: vi.fn().mockResolvedValue({ project }) })}
        onChange={vi.fn()}
        acceptServerProject={() => false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Draw my hero" }));
    await act(async () => {});

    expect(screen.queryByText(/new candidate is ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/around half a minute/i)).not.toBeInTheDocument();
  });

  it("ignores a stale hero response after the project and API context change", async () => {
    const projectA = makeProject();
    projectA.hero.childDescription = "Nova";
    const projectB = { ...makeProject(), id: "project-b" };
    projectB.hero.childDescription = "Orbit";
    const pending = deferred<{ project: Project }>();
    const acceptServerProject = vi.fn(() => true);
    const apiA = makeClientApi(projectA, { generateHero: vi.fn().mockReturnValue(pending.promise) });
    const apiB = makeClientApi(projectB);
    const view = render(
      <HeroWorkshop
        project={projectA}
        configStatus="enabled"
        saveState="saved"
        api={apiA}
        onChange={vi.fn()}
        acceptServerProject={acceptServerProject}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Draw my hero" }));
    view.rerender(
      <HeroWorkshop
        project={projectB}
        configStatus="enabled"
        saveState="saved"
        api={apiB}
        onChange={vi.fn()}
        acceptServerProject={acceptServerProject}
      />,
    );

    await act(async () => pending.resolve({ project: projectA }));

    expect(acceptServerProject).not.toHaveBeenCalled();
    expect(screen.queryByText(/new candidate is ready/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
