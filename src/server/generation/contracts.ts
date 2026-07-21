import { z } from "zod";
import {
  CoachSignalSchema,
  type CoachSignal,
} from "../../domain/story-coach";
import {
  BEAT_TEXT_MAX_LENGTH,
  HERO_DESCRIPTION_MAX_LENGTH,
  PANEL_ACTION_MAX_LENGTH,
  PANEL_FRAMING_MAX_LENGTH,
  PANEL_MOOD_MAX_LENGTH,
  PANEL_REVISION_MAX_LENGTH,
  PANEL_SETTING_MAX_LENGTH,
  STYLE_NOTES_MAX_LENGTH,
} from "../../domain/project";

export const RenderingChoicesSchema = z
  .object({
    shotSize: z.enum(["close", "medium", "wide"]),
    cameraAngle: z.enum(["eye_level", "low", "high"]),
    lighting: z.enum(["daylight", "golden", "moonlit", "dramatic"]),
    palette: z.enum(["warm", "cool", "bright", "muted"]),
    focus: z.enum(["hero", "action", "setting"]),
  })
  .strict();

export type RenderingChoices = z.infer<typeof RenderingChoicesSchema>;

export const CoachClassificationSchema = z.strictObject({
  signal: CoachSignalSchema,
});

export type CoachClassification = z.infer<typeof CoachClassificationSchema>;
export { CoachSignalSchema, type CoachSignal };

export const StoryCoachInputSchema = z.strictObject({
  setup: z.string().max(BEAT_TEXT_MAX_LENGTH),
  problem: z.string().max(BEAT_TEXT_MAX_LENGTH),
  bigMoment: z.string().max(BEAT_TEXT_MAX_LENGTH),
  ending: z.string().max(BEAT_TEXT_MAX_LENGTH),
  previousSignal: CoachSignalSchema.optional(),
});

export type StoryCoachInput = z.infer<typeof StoryCoachInputSchema>;

export const VisualInputSchema = z
  .object({
    heroDescription: z.string().max(HERO_DESCRIPTION_MAX_LENGTH),
    action: z.string().max(PANEL_ACTION_MAX_LENGTH),
    setting: z.string().max(PANEL_SETTING_MAX_LENGTH),
    mood: z.string().max(PANEL_MOOD_MAX_LENGTH),
    framing: z.string().max(PANEL_FRAMING_MAX_LENGTH),
    styleNotes: z.string().max(STYLE_NOTES_MAX_LENGTH),
    revisionDirection: z.string().max(PANEL_REVISION_MAX_LENGTH),
  })
  .strict();

export type VisualInput = z.infer<typeof VisualInputSchema>;

export interface GeneratedImage {
  bytes: Buffer;
  providerRequestId?: string;
  durationMs: number;
}

export interface GenerationProvider {
  moderate(text: string): Promise<void>;
  chooseRendering(input: VisualInput): Promise<RenderingChoices>;
  classifyStory(input: StoryCoachInput): Promise<CoachClassification>;
  generateHero(prompt: string): Promise<GeneratedImage>;
  generatePanel(referencePath: string, prompt: string): Promise<GeneratedImage>;
}
