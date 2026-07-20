import path from "node:path";
import type { TestProject } from "vitest/node";
import {
  cleanupOwnedTmpRoot,
  createOwnedTmpRoot,
  type OwnedTmpRoot,
} from "./support/tmp-lifecycle";

let ownedRoot: OwnedTmpRoot | undefined;

export async function setup(project: TestProject): Promise<void> {
  ownedRoot = await createOwnedTmpRoot(path.resolve("tmp"));
  project.provide("comicCreatorTmpRoot", ownedRoot);
}

export async function teardown(): Promise<void> {
  if (!ownedRoot) {
    throw new Error("Vitest temporary root was not established.");
  }
  await cleanupOwnedTmpRoot(ownedRoot);
}
