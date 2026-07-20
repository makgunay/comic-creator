import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";

export interface NormalizePanelAssetOptions {
  source: string;
  output: string;
  sourceSha256: string;
  outputSha256: string;
  quarantineRoot: string;
  normalize?: (sourceBytes: Buffer, temporary: string) => Promise<void>;
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String(error.code)
    : undefined;
}

async function validateSource(
  filename: string,
  expectedDigest: string,
): Promise<Buffer> {
  const bytes = await fs.readFile(filename);
  if (digest(bytes) !== expectedDigest) {
    throw new Error(`Unexpected sample image bytes for ${filename}`);
  }
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "png"
    || metadata.width === undefined
    || metadata.height === undefined
    || metadata.width !== metadata.height
    || metadata.width < 1024
  ) {
    throw new Error(`Sample source must be a square PNG at least 1024px: ${filename}`);
  }
  return bytes;
}

export async function validateNormalizedPanel(
  filename: string,
  expectedDigest: string,
): Promise<void> {
  const bytes = await fs.readFile(filename);
  if (digest(bytes) !== expectedDigest) {
    throw new Error(`Unexpected normalized sample image bytes for ${filename}`);
  }
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "png"
    || metadata.width !== 1024
    || metadata.height !== 1024
  ) {
    throw new Error(`Sample output must be an exact 1024px square PNG: ${filename}`);
  }
}

async function defaultNormalize(
  sourceBytes: Buffer,
  temporary: string,
): Promise<void> {
  await sharp(sourceBytes)
    .rotate()
    .resize(1024, 1024, {
      fit: "cover",
      kernel: sharp.kernel.lanczos3,
      position: "centre",
    })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      effort: 10,
      palette: false,
    })
    .toFile(temporary);
}

async function quarantineTemporary(
  temporary: string,
  quarantineRoot: string,
): Promise<void> {
  try {
    await fs.lstat(temporary);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return;
    throw error;
  }
  await fs.mkdir(quarantineRoot, { recursive: true });
  await fs.rename(
    temporary,
    path.join(
      quarantineRoot,
      `${path.basename(temporary)}-${randomUUID()}.invalid`,
    ),
  );
}

export async function normalizePanelAsset(
  options: NormalizePanelAssetOptions,
): Promise<void> {
  const sourceBytes = await validateSource(
    options.source,
    options.sourceSha256,
  );
  const temporary = `${options.output}.${randomUUID()}.tmp`;
  try {
    await (options.normalize ?? defaultNormalize)(sourceBytes, temporary);
    await validateNormalizedPanel(temporary, options.outputSha256);
    await fs.rename(temporary, options.output);
  } catch (error) {
    await quarantineTemporary(temporary, options.quarantineRoot);
    throw error;
  }
}
