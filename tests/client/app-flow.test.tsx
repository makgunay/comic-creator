import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/client/App";
import type { ComicApi } from "../../src/client/api/client";
import { makeClientApi } from "../fixtures/client-api-fixtures";
import { makeProject } from "../fixtures/project-fixtures";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function makeApi(overrides: Partial<ComicApi> = {}): ComicApi {
  const project = makeProject();
  return {
    ...makeClientApi(project),
    ...overrides,
  };
}

describe("App child flow", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("restores a saved local project from its project URL after a restart", async () => {
    const project = makeProject();
    const loadProject = vi.fn().mockResolvedValue(project);
    window.history.replaceState({}, "", `/?project=${project.id}`);

    render(<App api={makeApi({ loadProject })} />);

    expect(
      await screen.findByRole("heading", { name: "Create your hero" }),
    ).toBeInTheDocument();
    expect(loadProject).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("ignores an invalid project query instead of loading it", () => {
    const loadProject = vi.fn();
    window.history.replaceState({}, "", "/?project=unsafe_project");

    render(<App api={makeApi({ loadProject })} />);

    expect(
      screen.getByRole("heading", { name: "Your story deserves a comic." }),
    ).toBeInTheDocument();
    expect(loadProject).not.toHaveBeenCalled();
  });

  it("gives a newly created comic a reloadable local project URL", async () => {
    const user = userEvent.setup();
    const project = makeProject();
    render(<App api={makeApi({ createProject: vi.fn().mockResolvedValue(project) })} />);

    await user.type(screen.getByLabelText("Comic title"), "Moon Kite Club");
    await user.click(screen.getByRole("button", { name: "Start a new comic" }));
    await screen.findByRole("heading", { name: "Create your hero" });

    const url = new URL(window.location.href);
    expect(url.searchParams.get("project")).toBe(project.id);
    expect([...url.searchParams.entries()]).toEqual([["project", project.id]]);
    expect(url.href).not.toContain("Moon Kite Club");
    expect(url.href).not.toContain(project.localAuthorCredit);
  });

  it("navigates from a new project through hero, style, and story", async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);

    await user.type(screen.getByLabelText("Comic title"), "Moon Kite Club");
    await user.click(screen.getByRole("button", { name: "Start a new comic" }));
    expect(await screen.findByRole("heading", { name: "Create your hero" })).toBeInTheDocument();
    expect(screen.getByText("Sample mode")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Style" }));
    const styleHeading = screen.getByRole("heading", { name: "Choose your comic’s look" });
    expect(styleHeading).toBeInTheDocument();
    expect(styleHeading).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Story" }));
    const storyHeading = screen.getByRole("heading", { name: "Build your story" });
    expect(storyHeading).toBeInTheDocument();
    expect(storyHeading).toHaveFocus();
  });

  it("opens the sample into the same editable workshop", async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);

    await user.click(screen.getByRole("button", { name: "Explore the sample" }));

    expect(await screen.findByRole("heading", { name: "Create your hero" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Story" })).toBeEnabled();
  });

  it("enables Panels and Premiere only after their implementation", async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await user.click(screen.getByRole("button", { name: "Explore the sample" }));
    await screen.findByRole("heading", { name: "Create your hero" });

    expect(screen.getByRole("button", { name: "Panels" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Premiere" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Panels" }));
    expect(screen.getByRole("heading", { name: "Direct panel 1" })).toBeInTheDocument();
  });

  it("reaches the read-only premiere from the final panel", async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await user.click(screen.getByRole("button", { name: "Explore the sample" }));
    await screen.findByRole("heading", { name: "Create your hero" });
    await user.click(screen.getByRole("button", { name: "Panels" }));

    await user.click(screen.getByRole("button", { name: "Next: Panel 2" }));
    await user.click(screen.getByRole("button", { name: "Next: Panel 3" }));
    await user.click(screen.getByRole("button", { name: "Next: Panel 4" }));
    const premiere = screen.getByRole("button", { name: "Next: Premiere" });
    expect(premiere).toBeEnabled();
    await user.click(premiere);

    const heading = screen.getByRole("heading", { name: "Test Comic" });
    expect(heading).toHaveFocus();
    expect(screen.getByRole("link", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not announce Sample mode while configuration is loading", () => {
    const config = deferred<{ generationEnabled: boolean }>();
    render(<App api={makeApi({ config: vi.fn().mockReturnValue(config.promise) })} />);

    expect(screen.queryByText("Sample mode")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Checking the art studio" }))
      .toBeInTheDocument();
  });

  it("ignores an obsolete config response after the api prop changes", async () => {
    const oldConfig = deferred<{ generationEnabled: boolean }>();
    const newConfig = deferred<{ generationEnabled: boolean }>();
    const view = render(
      <App api={makeApi({ config: vi.fn().mockReturnValue(oldConfig.promise) })} />,
    );
    view.rerender(
      <App api={makeApi({ config: vi.fn().mockReturnValue(newConfig.promise) })} />,
    );

    await act(async () => newConfig.resolve({ generationEnabled: true }));
    expect(screen.queryByText("Sample mode")).not.toBeInTheDocument();

    await act(async () => oldConfig.resolve({ generationEnabled: false }));
    expect(screen.queryByText("Sample mode")).not.toBeInTheDocument();
  });

  it("clears an old config error while a replacement request loads and succeeds", async () => {
    const failedConfig = deferred<{ generationEnabled: boolean }>();
    const replacementConfig = deferred<{ generationEnabled: boolean }>();
    const firstApi = makeApi({ config: vi.fn().mockReturnValue(failedConfig.promise) });
    const secondApi = makeApi({ config: vi.fn().mockReturnValue(replacementConfig.promise) });
    const view = render(<App api={firstApi} />);

    await act(async () => failedConfig.reject(new Error("config failed")));
    expect(screen.getByRole("alert", { name: "Local mode" })).toBeInTheDocument();

    view.rerender(<App api={secondApi} />);
    expect(screen.queryByRole("alert", { name: "Local mode" })).not.toBeInTheDocument();
    expect(screen.queryByText("Sample mode")).not.toBeInTheDocument();

    await act(async () => replacementConfig.resolve({ generationEnabled: true }));
    expect(screen.queryByRole("alert", { name: "Local mode" })).not.toBeInTheDocument();
  });

  it("invalidates the config request on unmount even if the api ignores abort", async () => {
    const config = deferred<{ generationEnabled: boolean }>();
    const configCall = vi.fn().mockReturnValue(config.promise);
    const view = render(<App api={makeApi({ config: configCall })} />);
    const signal = configCall.mock.calls[0]?.[0]?.signal as AbortSignal;

    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => config.resolve({ generationEnabled: false }));
  });
});
