import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvironment, readConfig } from "../src/server/config";
import { OpenAIGenerationProvider } from "../src/server/generation/openai-provider";
import { buildImagePrompt } from "../src/server/generation/prompt-builder";
import { evaluateSmokeGate } from "../src/server/generation/smoke-gate";

loadEnvironment();

const outputDir = path.resolve("tmp/openai-smoke");
await fs.mkdir(outputDir, { recursive: true });
const provider = new OpenAIGenerationProvider(readConfig());
const heroDescription =
  "Nova, a young fictional inventor with a violet flight jacket, round goggles, dark curly hair, and a silver moon-kite spool.";

await provider.moderate(heroDescription);
const hero = await provider.generateHero(
  [
    "Create a square full-body comic character reference on a simple pale background.",
    heroDescription,
    "Bold ink outlines, warm textured color, expressive but not babyish. No text.",
  ].join("\n"),
);
const heroPath = path.join(outputDir, "hero.png");
await fs.writeFile(heroPath, hero.bytes);

const visualInput = {
  heroDescription,
  action: "Nova pulls the moon kite away from a storm cloud.",
  setting: "A city rooftop beneath a large moon.",
  mood: "brave and focused",
  framing: "show Nova and the full kite line",
  styleNotes:
    "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
  revisionDirection: "",
};
await provider.moderate(Object.values(visualInput).join("\n"));
const choices = await provider.chooseRendering(visualInput);
const panel = await provider.generatePanel(
  heroPath,
  buildImagePrompt(visualInput, choices),
);
const panelPath = path.join(outputDir, "panel.png");
await fs.writeFile(panelPath, panel.bytes);

const summary = evaluateSmokeGate({
  heroDurationMs: hero.durationMs,
  panelDurationMs: panel.durationMs,
});
console.log(
  JSON.stringify(
    {
      ...summary,
      providerRequestIds: {
        ...(hero.providerRequestId ? { hero: hero.providerRequestId } : {}),
        ...(panel.providerRequestId ? { panel: panel.providerRequestId } : {}),
      },
      artifacts: { heroPath, panelPath },
    },
    null,
    2,
  ),
);
if (!summary.gatePassed) {
  process.exitCode = 1;
}
