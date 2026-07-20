import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComicApi } from "../../src/client/api/client";
import { LaunchScreen } from "../../src/client/features/launch/LaunchScreen";
import { makeProject } from "../fixtures/project-fixtures";

function makeApi(overrides: Partial<ComicApi> = {}): ComicApi {
  const project = makeProject();
  return {
    config: vi.fn().mockResolvedValue({ generationEnabled: false }),
    createProject: vi.fn().mockResolvedValue(project),
    copySample: vi.fn().mockResolvedValue(project),
    loadProject: vi.fn().mockResolvedValue(project),
    saveProject: vi.fn().mockResolvedValue(project),
    ...overrides,
  };
}

describe("LaunchScreen", () => {
  it("offers exactly the two primary launch actions", () => {
    render(<LaunchScreen api={makeApi()} onOpenProject={vi.fn()} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Start a new comic",
      "Explore the sample",
    ]);
    expect(screen.queryByText(/api key/i)).not.toBeInTheDocument();
  });

  it("creates a titled project with optional local author credit", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    const createProject = vi.fn().mockResolvedValue(project);
    const onOpenProject = vi.fn();
    render(
      <LaunchScreen
        api={makeApi({ createProject })}
        onOpenProject={onOpenProject}
      />,
    );

    await user.type(screen.getByLabelText("Comic title"), "Sky Lantern Club");
    await user.type(screen.getByLabelText("Author credit (optional)"), "M.");
    await user.click(screen.getByRole("button", { name: "Start a new comic" }));

    expect(createProject).toHaveBeenCalledWith({
      title: "Sky Lantern Club",
      localAuthorCredit: "M.",
    });
    expect(onOpenProject).toHaveBeenCalledWith(project);
  });

  it("opens a writable sample copy", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    const copySample = vi.fn().mockResolvedValue(project);
    const onOpenProject = vi.fn();
    render(
      <LaunchScreen api={makeApi({ copySample })} onOpenProject={onOpenProject} />,
    );

    await user.click(screen.getByRole("button", { name: "Explore the sample" }));

    expect(copySample).toHaveBeenCalledOnce();
    expect(onOpenProject).toHaveBeenCalledWith(project);
  });
});
