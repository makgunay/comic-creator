import { z } from "zod";

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

export const VisualInputSchema = z
  .object({
    heroDescription: z.string(),
    action: z.string(),
    setting: z.string(),
    mood: z.string(),
    framing: z.string(),
    styleNotes: z.string(),
    revisionDirection: z.string(),
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
  generateHero(prompt: string): Promise<GeneratedImage>;
  generatePanel(referencePath: string, prompt: string): Promise<GeneratedImage>;
}
