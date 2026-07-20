import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/client/App";
import type { ComicApi } from "../../src/client/api/client";
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
    config: vi.fn().mockResolvedValue({ generationEnabled: false }),
    createProject: vi.fn().mockResolvedValue(project),
    copySample: vi.fn().mockResolvedValue(project),
    loadProject: vi.fn().mockResolvedValue(project),
    saveProject: vi.fn().mockImplementation(async (next) => next),
    ...overrides,
  };
}

describe("App child flow", () => {
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
