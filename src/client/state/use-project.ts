import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Project } from "../../domain/project";
import { comicApi, type ComicApi } from "../api/client";

export type SaveState = "loading" | "dirty" | "saving" | "saved" | "error";

interface State {
  project?: Project;
  saveState: SaveState;
  editRevision: number;
}

type Action =
  | { type: "load-start" }
  | { type: "load-success"; project: Project }
  | { type: "load-error" }
  | { type: "update"; mutator: (current: Project) => Project }
  | { type: "save-start"; revision: number }
  | { type: "save-success"; revision: number; project: Project }
  | { type: "save-error"; revision: number };

const initialState: State = { saveState: "loading", editRevision: 0 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load-start":
      return { saveState: "loading", editRevision: 0 };
    case "load-success":
      return { project: action.project, saveState: "saved", editRevision: 0 };
    case "load-error":
      return { saveState: "error", editRevision: 0 };
    case "update":
      if (!state.project) return state;
      return {
        project: action.mutator(state.project),
        saveState: "dirty",
        editRevision: state.editRevision + 1,
      };
    case "save-start":
      return action.revision === state.editRevision
        ? { ...state, saveState: "saving" }
        : state;
    case "save-success":
      return action.revision === state.editRevision
        ? { ...state, project: action.project, saveState: "saved" }
        : state;
    case "save-error":
      return action.revision === state.editRevision
        ? { ...state, saveState: "error" }
        : state;
  }
}

export function useProject(projectId: string, api: ComicApi = comicApi) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const context = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadController = useRef<AbortController | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => {
    const activeContext = context.current + 1;
    context.current = activeContext;
    clearTimer();
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    dispatch({ type: "load-start" });

    void api.loadProject(projectId, { signal: controller.signal })
      .then((project) => {
        if (context.current === activeContext && !controller.signal.aborted) {
          dispatch({ type: "load-success", project });
        }
      })
      .catch((error: unknown) => {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (!aborted && context.current === activeContext) {
          dispatch({ type: "load-error" });
        }
      });

    return () => {
      controller.abort();
      clearTimer();
      if (context.current === activeContext) context.current += 1;
    };
  }, [api, clearTimer, projectId]);

  useEffect(() => {
    if (!state.project || state.saveState !== "dirty") return;
    clearTimer();
    const activeContext = context.current;
    const revision = state.editRevision;
    const snapshot = state.project;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      if (context.current !== activeContext) return;
      dispatch({ type: "save-start", revision });
      void api.saveProject(snapshot, { keepalive: false })
        .then((project) => {
          if (context.current === activeContext) {
            dispatch({ type: "save-success", revision, project });
          }
        })
        .catch(() => {
          if (context.current === activeContext) {
            dispatch({ type: "save-error", revision });
          }
        });
    }, 500);

    return clearTimer;
  }, [api, clearTimer, state.editRevision, state.project, state.saveState]);

  useEffect(() => {
    const flush = () => {
      if (!state.project || state.saveState === "saved" || state.saveState === "loading") {
        return;
      }
      clearTimer();
      const activeContext = context.current;
      const revision = state.editRevision;
      dispatch({ type: "save-start", revision });
      void api.saveProject(state.project, { keepalive: true })
        .then((project) => {
          if (context.current === activeContext) {
            dispatch({ type: "save-success", revision, project });
          }
        })
        .catch(() => {
          if (context.current === activeContext) {
            dispatch({ type: "save-error", revision });
          }
        });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [api, clearTimer, state.editRevision, state.project, state.saveState]);

  const update = useCallback((mutator: (current: Project) => Project) => {
    dispatch({ type: "update", mutator });
  }, []);

  return { project: state.project, saveState: state.saveState, update };
}
