import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ProjectSchema } from "../src/domain/project";
import {
  normalizePanelAsset,
  validateNormalizedPanel,
} from "./sample-asset-builder";

const generatedRoot = path.resolve(
  os.homedir(),
  ".codex/generated_images/019f7b71-d9cf-76d3-979d-f257a879f379",
);
const fixtureRoot = path.resolve("sample-assets/moon-kite");
const imageRoot = path.join(fixtureRoot, "images");
const quarantineRoot = path.resolve("tmp/sample-build-recovery");
const panelSources = [
  {
    source: "call_wG5POt6gJci71LL1eovyCyMv.png",
    output: "panel-1.png",
    sha256: "ad311aae3f64e9e2909d016227fa2d5bf6f76d6672c3a2e7d23e9996c6b668c0",
    outputSha256: "97b470b0075d815f6a7376c97c91c4a00712152bab8f2f6137adf682ab2d269e",
  },
  {
    source: "call_hEOCX0BYnA89XtSHpMdPDSqv.png",
    output: "panel-2.png",
    sha256: "37a59e96e605e80273d1022e21eb0791d937dc675e3bbebf102638db5b3c8390",
    outputSha256: "a108c6a14ac1f1a694b33972c0a078da5a384a477f45641071499641c66dbc65",
  },
  {
    source: "call_VB0LefnOmzSLrXXfFnzUfKL4.png",
    output: "panel-3.png",
    sha256: "74b5bcdd7deab84c512cfea8a943f01f53118a03ba5f9d9c9b7ad8413c01cb5d",
    outputSha256: "2dd04c975ba2e1cdcc334d308a52eab718b7f8d3e6b7cf6686117cdf377d5a36",
  },
  {
    source: "call_44IIvjV7QfpCLOIhRe552yZQ.png",
    output: "panel-4.png",
    sha256: "5d92075799c42aa9d071a688bc3c0c8844673a066f3032f398a3dd17837736a6",
    outputSha256: "7c3fed308aac7fd9a81d70dd6762c6585bf96f16378e6b86dd96531464efceba",
  },
] as const;

await fs.mkdir(imageRoot, { recursive: true });
for (const panel of panelSources) {
  const source = path.join(generatedRoot, panel.source);
  const output = path.join(imageRoot, panel.output);
  try {
    await normalizePanelAsset({
      source,
      output,
      sourceSha256: panel.sha256,
      outputSha256: panel.outputSha256,
      quarantineRoot,
    });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
  await validateNormalizedPanel(output, panel.outputSha256);
}

const beatDefinitions = [
  {
    id: "beat-setup",
    type: "setup",
    childText: "Nova tests her moon kite.",
    panelId: "panel-1",
  },
  {
    id: "beat-problem",
    type: "problem",
    childText: "A storm cloud catches it.",
    panelId: "panel-2",
  },
  {
    id: "beat-big-moment",
    type: "bigMoment",
    childText: "Nova climbs the tower and pulls it free.",
    panelId: "panel-3",
  },
  {
    id: "beat-ending",
    type: "ending",
    childText: "The kite lights the whole neighborhood.",
    panelId: "panel-4",
  },
] as const;
const dialogue = [
  "Tonight, I’ll touch the moon!",
  "Oh no—the wind has other plans!",
  "Hold on, little kite!",
  "We made our own moonlight.",
] as const;
const moods = ["hopeful", "worried", "brave", "joyful"] as const;
const project = ProjectSchema.parse({
  id: "sample-moon-kite",
  schemaVersion: 1,
  title: "Nova and the Moon Kite",
  localAuthorCredit: "M.",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  hero: {
    childDescription: "Nova wears a violet flight jacket and round goggles and carries a silver moon-kite spool.",
    imageVersions: [],
  },
  visualStyle: {
    presetId: "cartoon",
    baselineNotes: "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
    editedNotes: "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
  },
  beats: beatDefinitions.map((beat) => ({
    id: beat.id,
    type: beat.type,
    childText: beat.childText,
    panelIds: [beat.panelId],
  })),
  panels: beatDefinitions.map((beat, index) => ({
    id: beat.panelId,
    beatId: beat.id,
    order: index,
    action: beat.childText,
    setting: index === 0
      ? "Nova’s rooftop workshop at night."
      : "The city rooftops beneath the moon.",
    mood: moods[index],
    framing: "Show Nova, the kite, and the moon clearly.",
    overlays: [{
      id: `dialogue-${index + 1}`,
      kind: "dialogue",
      text: dialogue[index],
      speaker: "Nova",
      x: 0.06,
      y: 0.06,
      width: 0.48,
      height: 0.22,
    }],
    approvedImageVersionId: `sample-art-${index + 1}`,
    imageVersions: [{
      id: `sample-art-${index + 1}`,
      localPath: `images/panel-${index + 1}.png`,
      createdAt: "2026-07-20T00:00:00.000Z",
      childRevisionDirection: "",
      status: "approved",
    }],
    generationStatus: "idle",
  })),
});
const documentPath = path.join(fixtureRoot, "project.json");
const temporaryDocument = `${documentPath}.${randomUUID()}.tmp`;
await fs.writeFile(
  temporaryDocument,
  `${JSON.stringify(project, null, 2)}\n`,
  "utf8",
);
await fs.rename(temporaryDocument, documentPath);
