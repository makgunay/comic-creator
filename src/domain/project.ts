import { z } from "zod";

export const BeatTypeSchema = z.enum(["setup", "problem", "bigMoment", "ending"]);
export const StylePresetSchema = z.enum(["cartoon", "manga", "superhero"]);
export const GenerationStatusSchema = z.enum(["idle", "generating", "failed-retryable"]);

export const TextOverlaySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["dialogue", "caption"]),
  text: z.string(),
  speaker: z.string().optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

export const ImageVersionSchema = z.object({
  id: z.string().min(1),
  localPath: z.string().regex(/^images\/(?!.*(?:^|\/)\.\.(?:\/|$)).+$/),
  createdAt: z.string().datetime(),
  sourceReferenceImageId: z.string().optional(),
  providerRequestId: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  childRevisionDirection: z.string(),
  status: z.enum(["candidate", "approved", "rejected"]),
});

export const PanelSchema = z.object({
  id: z.string().min(1),
  beatId: z.string().min(1),
  order: z.number().int().nonnegative(),
  action: z.string(),
  setting: z.string(),
  mood: z.string(),
  framing: z.string(),
  overlays: z.array(TextOverlaySchema),
  approvedImageVersionId: z.string().optional(),
  imageVersions: z.array(ImageVersionSchema),
  generationStatus: GenerationStatusSchema,
});

export const BeatSchema = z.object({
  id: z.string().min(1),
  type: BeatTypeSchema,
  childText: z.string(),
  panelIds: z.array(z.string()),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  localAuthorCredit: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  hero: z.object({
    childDescription: z.string(),
    approvedReferenceImageId: z.string().optional(),
    imageVersions: z.array(ImageVersionSchema),
  }),
  visualStyle: z.object({
    presetId: StylePresetSchema,
    baselineNotes: z.string(),
    editedNotes: z.string(),
  }),
  beats: z.array(BeatSchema).length(4),
  panels: z.array(PanelSchema).min(4),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Panel = z.infer<typeof PanelSchema>;
export type ImageVersion = z.infer<typeof ImageVersionSchema>;

const beatTypes = BeatTypeSchema.options;
const cartoonNotes = "Bold ink outlines, warm textured color, expressive faces, clear shapes.";

export function createProject(input: { title: string; localAuthorCredit: string }): Project {
  const now = new Date().toISOString();
  const beats = beatTypes.map((type) => ({
    id: globalThis.crypto.randomUUID(),
    type,
    childText: "",
    panelIds: [] as string[],
  }));
  const panels = beats.map((beat, order) => {
    const id = globalThis.crypto.randomUUID();
    beat.panelIds.push(id);
    return {
      id,
      beatId: beat.id,
      order,
      action: "",
      setting: "",
      mood: "",
      framing: "",
      overlays: [],
      imageVersions: [],
      generationStatus: "idle" as const,
    };
  });

  return ProjectSchema.parse({
    id: globalThis.crypto.randomUUID(),
    schemaVersion: 1,
    title: input.title,
    localAuthorCredit: input.localAuthorCredit,
    createdAt: now,
    updatedAt: now,
    hero: { childDescription: "", imageVersions: [] },
    visualStyle: { presetId: "cartoon", baselineNotes: cartoonNotes, editedNotes: cartoonNotes },
    beats,
    panels,
  });
}
