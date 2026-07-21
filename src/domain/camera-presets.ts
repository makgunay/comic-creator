export const CAMERA_PRESETS = [
  {
    id: "whole-scene",
    label: "Whole scene",
    help: "See everyone and where they are.",
    prompt: "wide shot, eye-level view, show the characters and the full environment",
  },
  {
    id: "character-and-action",
    label: "Character and action",
    help: "See the character clearly and what they are doing.",
    prompt: "medium shot, eye-level view, keep the character and action easy to see",
  },
  {
    id: "face-and-feelings",
    label: "Face and feelings",
    help: "Fill the panel with a face and expression.",
    prompt: "close-up, eye-level view, fill the frame with the character's face and expression",
  },
  {
    id: "looking-down",
    label: "Looking down",
    help: "Look down on the scene from above.",
    prompt: "high-angle view from above, make the layout of the scene clear",
  },
  {
    id: "looking-up",
    label: "Looking up",
    help: "Look up so the character feels big and bold.",
    prompt: "low-angle view from below, make the character feel bold and powerful",
  },
] as const;

export type CameraPresetId = (typeof CAMERA_PRESETS)[number]["id"];

export function cameraPresetForFraming(framing: string) {
  const normalized = framing.trim().toLowerCase();
  if (!normalized) return undefined;
  const exact = CAMERA_PRESETS.find((preset) => preset.prompt === framing);
  if (exact) return exact;
  if (/high|above|looking down|top[- ]down/.test(normalized)) {
    return CAMERA_PRESETS.find((preset) => preset.id === "looking-down");
  }
  if (/low|below|looking up/.test(normalized)) {
    return CAMERA_PRESETS.find((preset) => preset.id === "looking-up");
  }
  if (/close|face|expression/.test(normalized)) {
    return CAMERA_PRESETS.find((preset) => preset.id === "face-and-feelings");
  }
  if (/medium|action/.test(normalized)) {
    return CAMERA_PRESETS.find((preset) => preset.id === "character-and-action");
  }
  if (/wide|whole|environment|scene/.test(normalized)) {
    return CAMERA_PRESETS.find((preset) => preset.id === "whole-scene");
  }
  return undefined;
}

export function cameraPromptForPreset(id: string): string {
  return CAMERA_PRESETS.find((preset) => preset.id === id)?.prompt ?? "";
}
