import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { normalizePanelAsset } from "../../scripts/sample-asset-builder";

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function entriesOrEmpty(directory: string): Promise<string[]> {
  try {
    return await fs.readdir(directory);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

it("quarantines an invalid normalized temp before it can replace known-good output", async () => {
  const root = path.resolve("tmp", `sample-builder-${randomUUID()}`);
  const source = path.join(root, "source.png");
  const output = path.join(root, "panel.png");
  const quarantineRoot = path.join(root, "recovery");
  await fs.mkdir(root, { recursive: true });
  await fs.copyFile("sample-assets/moon-kite/images/sample-art-1.png", source);
  await fs.copyFile("sample-assets/moon-kite/images/sample-art-1.png", output);
  const knownGood = await fs.readFile(output);
  const expectedDigest = digest(knownGood);

  await expect(normalizePanelAsset({
    source,
    output,
    sourceSha256: expectedDigest,
    outputSha256: expectedDigest,
    quarantineRoot,
    normalize: async (_sourceBytes, temporary) => {
      await fs.writeFile(temporary, "not a png", "utf8");
    },
  })).rejects.toThrow();

  expect(digest(await fs.readFile(output))).toBe(expectedDigest);
  expect((await entriesOrEmpty(root)).filter((entry) => entry.includes(".tmp"))).toEqual([]);
  expect(await entriesOrEmpty(quarantineRoot)).not.toEqual([]);
});
