import type { Project } from "../../domain/project";
import type { RenderingChoices, VisualInput } from "./contracts";

type TextOverlay = Project["panels"][number]["overlays"][number];

function percentage(value: number): number {
  return Math.round(value * 100);
}

function letteringInstructions(overlays: readonly TextOverlay[]): string[] {
  if (overlays.length === 0) {
    return [
      "Create one square comic illustration with no written words, letters, speech bubbles, logos, or watermarks.",
    ];
  }
  return [
    "Create one square comic illustration and render only the child-authored lettering listed below.",
    "Copy every quoted string verbatim, exactly once, with no missing or extra characters. Use clean, bold, highly legible comic lettering.",
    ...overlays.map((overlay, index) =>
      `${overlay.kind === "dialogue" ? "Speech bubble" : "Caption box"} ${index + 1}: ${JSON.stringify(overlay.text)}. Place it ${percentage(overlay.x)}% from the left and ${percentage(overlay.y)}% from the top of the square image; use about ${percentage(overlay.width)}% of the image width and ${percentage(overlay.height)}% of the image height.`),
    "Do not add any other text, letters, logos, signatures, or watermarks.",
  ];
}

export function buildImagePrompt(
  input: VisualInput,
  choices: RenderingChoices,
  lettering: readonly TextOverlay[] = [],
): string {
  return [
    ...letteringInstructions(lettering),
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
