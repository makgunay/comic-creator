import type { RenderingChoices, VisualInput } from "./contracts";

export function buildImagePrompt(
  input: VisualInput,
  choices: RenderingChoices,
): string {
  return [
    "Create one square comic illustration with no written words, letters, speech bubbles, logos, or watermarks.",
    `Hero continuity: ${input.heroDescription}`,
    `Preserve this action exactly: ${input.action}`,
    `Preserve this setting exactly: ${input.setting}`,
    `Mood: ${input.mood}`,
    `Framing request: ${input.framing}`,
    `Art style: ${input.styleNotes}`,
    `Rendering choices: ${choices.shotSize} shot, ${choices.cameraAngle} angle, ${choices.lighting} lighting, ${choices.palette} palette, focus on ${choices.focus}.`,
    input.revisionDirection
      ? `Child-requested visual change: ${input.revisionDirection}`
      : "",
    "Do not add a new character, plot event, important prop, or story resolution.",
  ]
    .filter(Boolean)
    .join("\n");
}
