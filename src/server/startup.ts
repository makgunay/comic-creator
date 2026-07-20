import type { ProjectStore } from "./storage/project-store";

export function prepareServerState(store: ProjectStore): Promise<number> {
  return store.recoverInterruptedGenerations();
}
