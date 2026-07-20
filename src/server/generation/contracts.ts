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

export interface VisualInput {
  heroDescription: string;
  action: string;
  setting: string;
  mood: string;
  framing: string;
  styleNotes: string;
  revisionDirection: string;
}

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
