import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvironment, readConfig } from "../src/server/config";
import { OpenAIGenerationProvider } from "../src/server/generation/openai-provider";
import { buildImagePrompt } from "../src/server/generation/prompt-builder";

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

if (hero.durationMs > 60_000) {
  throw new Error(`Hero generation exceeded the 60000ms gate: ${hero.durationMs}ms`);
}
if (panel.durationMs > 30_000) {
  throw new Error(`Panel generation exceeded the 30000ms gate: ${panel.durationMs}ms`);
}

console.log(
  JSON.stringify(
    {
      heroDurationMs: hero.durationMs,
      panelDurationMs: panel.durationMs,
      ...(hero.providerRequestId
        ? { heroProviderRequestId: hero.providerRequestId }
        : {}),
      ...(panel.providerRequestId
        ? { panelProviderRequestId: panel.providerRequestId }
        : {}),
      heroPath,
      panelPath,
    },
    null,
    2,
  ),
);
