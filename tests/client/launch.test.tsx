import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ComicApiError, type ComicApi } from "../../src/client/api/client";
import { LaunchScreen } from "../../src/client/features/launch/LaunchScreen";
import { makeClientApi } from "../fixtures/client-api-fixtures";
import { makeProject } from "../fixtures/project-fixtures";

function makeApi(overrides: Partial<ComicApi> = {}): ComicApi {
  const project = makeProject();
  return {
    ...makeClientApi(project),
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

  it("keeps launch requests active through Strict Mode's effect replay", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    const onOpenProject = vi.fn();
    render(
      <StrictMode>
        <LaunchScreen api={makeApi({ copySample: vi.fn().mockResolvedValue(project) })} onOpenProject={onOpenProject} />
      </StrictMode>,
    );

    await user.click(screen.getByRole("button", { name: "Explore the sample" }));

    expect(onOpenProject).toHaveBeenCalledWith(project);
  });

  it("announces launch failures as alerts", async () => {
    const user = userEvent.setup();
    const createProject = vi.fn().mockRejectedValue(new ComicApiError({
      code: "storage",
      message: "The local project could not be saved.",
      retryable: true,
    }));
    render(
      <LaunchScreen api={makeApi({ createProject })} onOpenProject={vi.fn()} />,
    );

    await user.type(screen.getByLabelText("Comic title"), "Sky Lantern Club");
    await user.click(screen.getByRole("button", { name: "Start a new comic" }));

    expect(await screen.findByRole("alert", { name: "Try again" }))
      .toHaveTextContent("The local project could not be saved.");
  });

  it("ignores an obsolete create completion after the api prop changes", async () => {
    const user = userEvent.setup();
    let resolveCreate!: (project: ReturnType<typeof makeProject>) => void;
    const pendingCreate = new Promise<ReturnType<typeof makeProject>>((resolve) => {
      resolveCreate = resolve;
    });
    const onOpenProject = vi.fn();
    const firstApi = makeApi({ createProject: vi.fn().mockReturnValue(pendingCreate) });
    const secondApi = makeApi();
    const view = render(
      <LaunchScreen api={firstApi} onOpenProject={onOpenProject} />,
    );

    await user.type(screen.getByLabelText("Comic title"), "Sky Lantern Club");
    await user.click(screen.getByRole("button", { name: "Start a new comic" }));
    view.rerender(<LaunchScreen api={secondApi} onOpenProject={onOpenProject} />);
    await act(async () => resolveCreate(makeProject()));

    expect(onOpenProject).not.toHaveBeenCalled();
  });
});
