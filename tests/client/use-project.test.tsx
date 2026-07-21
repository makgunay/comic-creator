import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../../src/domain/project";
import type { ComicApi } from "../../src/client/api/client";
import { useProject } from "../../src/client/state/use-project";
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

function makeApi(project: Project, overrides: Partial<ComicApi> = {}): ComicApi {
  return {
    ...makeClientApi(project),
    ...overrides,
  };
}

function Harness({ projectId, api }: { projectId: string; api: ComicApi }) {
  const { project, saveState, update, acceptServerProject } = useProject(projectId, api);
  return (
    <div>
      <output aria-label="Project title">{project?.title ?? "none"}</output>
      <output aria-label="Save state">{saveState}</output>
      <button onClick={() => update((current) => ({ ...current, title: "First edit" }))}>First edit</button>
      <button onClick={() => update((current) => ({ ...current, title: "Latest edit" }))}>Latest edit</button>
      <button onClick={() => project && acceptServerProject({ ...project, title: "Server project" })}>
        Accept server project
      </button>
    </div>
  );
}

function AcceptanceHarness({
  projectId,
  api,
  expose,
}: {
  projectId: string;
  api: ComicApi;
  expose: (accept: (project: Project) => boolean) => void;
}) {
  const { project, saveState, acceptServerProject } = useProject(projectId, api);
  expose(acceptServerProject);
  return (
    <div>
      <output aria-label="Project title">{project?.title ?? "none"}</output>
      <output aria-label="Save state">{saveState}</output>
    </div>
  );
}

describe("useProject", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces saves for 500ms and reports Saved only after confirmation", async () => {
    const project = makeProject();
    const pending = deferred<Project>();
    const saveProject = vi.fn().mockReturnValue(pending.promise);
    render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "First edit" }));
    expect(screen.getByLabelText("Save state")).toHaveTextContent("dirty");
    await act(async () => vi.advanceTimersByTime(499));
    expect(saveProject).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(saveProject).toHaveBeenCalledWith(
      expect.objectContaining({ title: "First edit" }),
      expect.objectContaining({ keepalive: false }),
    );
    expect(screen.getByLabelText("Save state")).toHaveTextContent("saving");

    await act(async () => pending.resolve({ ...project, title: "First edit" }));
    expect(screen.getByLabelText("Save state")).toHaveTextContent("saved");
  });

  it("ignores an older save response so it cannot overwrite or mark a newer edit saved", async () => {
    const project = makeProject();
    const first = deferred<Project>();
    const second = deferred<Project>();
    const saveProject = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "First edit" }));
    await act(async () => vi.advanceTimersByTime(500));
    fireEvent.click(screen.getByRole("button", { name: "Latest edit" }));
    await act(async () => vi.advanceTimersByTime(500));

    await act(async () => first.resolve({ ...project, title: "First edit" }));
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Latest edit");
    expect(screen.getByLabelText("Save state")).not.toHaveTextContent("saved");

    await act(async () => second.resolve({ ...project, title: "Latest edit" }));
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Latest edit");
    expect(screen.getByLabelText("Save state")).toHaveTextContent("saved");
  });

  it("flushes the latest edit on pagehide", async () => {
    const project = makeProject();
    const saveProject = vi.fn().mockResolvedValue({ ...project, title: "Latest edit" });
    render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Latest edit" }));
    await act(async () => window.dispatchEvent(new Event("pagehide")));

    expect(saveProject).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Latest edit" }),
      expect.objectContaining({ keepalive: true }),
    );
  });

  it("ignores a late old failure after the newer same-revision pagehide save succeeds", async () => {
    const project = makeProject();
    const oldAttempt = deferred<Project>();
    const newestAttempt = deferred<Project>();
    const saveProject = vi.fn()
      .mockReturnValueOnce(oldAttempt.promise)
      .mockReturnValueOnce(newestAttempt.promise);
    render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Latest edit" }));
    await act(async () => vi.advanceTimersByTime(500));
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(saveProject).toHaveBeenCalledTimes(2);

    await act(async () => newestAttempt.resolve({
      ...project,
      title: "Latest edit confirmed",
    }));
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Latest edit confirmed");
    expect(screen.getByLabelText("Save state")).toHaveTextContent("saved");

    await act(async () => oldAttempt.reject(new Error("older request failed")));
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Latest edit confirmed");
    expect(screen.getByLabelText("Save state")).toHaveTextContent("saved");
  });

  it("ignores a late old success after the newer same-revision pagehide save fails", async () => {
    const project = makeProject();
    const oldAttempt = deferred<Project>();
    const newestAttempt = deferred<Project>();
    const saveProject = vi.fn()
      .mockReturnValueOnce(oldAttempt.promise)
      .mockReturnValueOnce(newestAttempt.promise);
    render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Latest edit" }));
    await act(async () => vi.advanceTimersByTime(500));
    await act(async () => window.dispatchEvent(new Event("pagehide")));

    await act(async () => newestAttempt.reject(new Error("newest request failed")));
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Latest edit");
    expect(screen.getByLabelText("Save state")).toHaveTextContent("error");

    await act(async () => oldAttempt.resolve({ ...project, title: "Old server copy" }));
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Latest edit");
    expect(screen.getByLabelText("Save state")).toHaveTextContent("error");
  });

  it("keeps one stable pagehide listener while project state changes", async () => {
    const project = makeProject();
    const addEventListener = vi.spyOn(window, "addEventListener");
    render(<Harness projectId={project.id} api={makeApi(project)} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "First edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Latest edit" }));

    const pagehideRegistrations = addEventListener.mock.calls
      .filter(([eventName]) => eventName === "pagehide");
    expect(pagehideRegistrations).toHaveLength(1);
  });

  it("ignores obsolete loads and cancels the old project timer", async () => {
    const projectA = { ...makeProject(), id: "project-a", title: "Project A" };
    const projectB = { ...makeProject(), id: "project-b", title: "Project B" };
    const loadA = deferred<Project>();
    const loadB = deferred<Project>();
    const loadProject = vi.fn()
      .mockReturnValueOnce(loadA.promise)
      .mockReturnValueOnce(loadB.promise);
    const saveProject = vi.fn().mockResolvedValue(projectA);
    const api = makeApi(projectA, { loadProject, saveProject });
    const view = render(<Harness projectId="project-a" api={api} />);

    await act(async () => loadA.resolve(projectA));
    fireEvent.click(screen.getByRole("button", { name: "First edit" }));
    view.rerender(<Harness projectId="project-b" api={api} />);
    await act(async () => loadB.resolve(projectB));
    await act(async () => vi.advanceTimersByTime(500));

    expect(screen.getByLabelText("Project title")).toHaveTextContent("Project B");
    expect(saveProject).not.toHaveBeenCalled();
    expect(loadProject.mock.calls[0]?.[1]?.signal.aborted).toBe(true);
  });

  it("cancels pending timers when unmounted", async () => {
    const project = makeProject();
    const saveProject = vi.fn().mockResolvedValue(project);
    const view = render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "First edit" }));

    view.unmount();
    await act(async () => vi.advanceTimersByTime(500));

    expect(saveProject).not.toHaveBeenCalled();
  });

  it("accepts a server-confirmed project without autosaving it and cancels pending timers", async () => {
    const project = makeProject();
    const saveProject = vi.fn().mockResolvedValue(project);
    render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "First edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept server project" }));
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Server project");
    expect(screen.getByLabelText("Save state")).toHaveTextContent("saved");
    await act(async () => vi.advanceTimersByTime(500));

    expect(saveProject).not.toHaveBeenCalled();
  });

  it("supersedes an in-flight autosave when accepting a server-confirmed project", async () => {
    const project = makeProject();
    const oldSave = deferred<Project>();
    const saveProject = vi.fn().mockReturnValue(oldSave.promise);
    render(<Harness projectId={project.id} api={makeApi(project, { saveProject })} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "First edit" }));
    await act(async () => vi.advanceTimersByTime(500));

    fireEvent.click(screen.getByRole("button", { name: "Accept server project" }));
    await act(async () => oldSave.resolve({ ...project, title: "Stale save response" }));

    expect(screen.getByLabelText("Project title")).toHaveTextContent("Server project");
    expect(screen.getByLabelText("Save state")).toHaveTextContent("saved");
  });

  it("rejects a server project from an obsolete project context", async () => {
    const projectA = { ...makeProject(), id: "project-a", title: "Project A" };
    const projectB = { ...makeProject(), id: "project-b", title: "Project B" };
    const api = makeApi(projectA, {
      loadProject: vi.fn(async (id) => id === projectA.id ? projectA : projectB),
    });
    let oldAccept: ((project: Project) => boolean) | undefined;
    let latestAccept: ((project: Project) => boolean) | undefined;
    const view = render(
      <AcceptanceHarness
        projectId={projectA.id}
        api={api}
        expose={(accept) => { oldAccept ??= accept; latestAccept = accept; }}
      />,
    );
    await act(async () => {});
    view.rerender(
      <AcceptanceHarness
        projectId={projectB.id}
        api={api}
        expose={(accept) => { latestAccept = accept; }}
      />,
    );
    await act(async () => {});

    expect(oldAccept?.({ ...projectA, title: "Stale server project" })).toBe(false);
    await act(async () => {
      expect(latestAccept?.({ ...projectB, title: "Current server project" })).toBe(true);
    });
    expect(screen.getByLabelText("Project title")).toHaveTextContent("Current server project");
  });
});
