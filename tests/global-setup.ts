import path from "node:path";
import {
  cleanupNewTmpEntries,
  snapshotTmpChildren,
} from "./support/tmp-lifecycle";

const repoTmp = path.resolve("tmp");
let before = new Set<string>();

export async function setup(): Promise<void> {
  before = await snapshotTmpChildren(repoTmp);
}

export async function teardown(): Promise<void> {
  await cleanupNewTmpEntries(repoTmp, before);
}
