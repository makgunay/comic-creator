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

export function buildHeroImagePrompt(
  input: VisualInput,
  choices: RenderingChoices,
): string {
  return [
    "Create one square full-body comic character reference on a plain pale background.",
    `Child-authored hero, preserve exactly: ${input.heroDescription}`,
    `Editable art style, preserve exactly: ${input.styleNotes}`,
    `${choices.shotSize} shot, ${choices.cameraAngle} angle, ${choices.lighting} lighting, ${choices.palette} palette, focus on ${choices.focus}.`,
    "No text, letters, speech bubbles, logos, watermarks, extra characters, plot events, or story settings.",
  ].join("\n");
}
