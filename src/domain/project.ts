import { z } from "zod";

export const BeatTypeSchema = z.enum(["setup", "problem", "bigMoment", "ending"]);
export const StylePresetSchema = z.enum(["cartoon", "manga", "superhero"]);
export const GenerationStatusSchema = z.enum(["idle", "generating", "failed-retryable"]);

const isRelativeImageAssetKey = (localPath: string) => {
  const segments = localPath.split("/");
  return localPath.startsWith("images/")
    && !localPath.includes("\\")
    && segments.every((segment) => segment.length > 0 && segment !== "..");
};

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
  localPath: z.string().refine(isRelativeImageAssetKey, {
    message: "Image paths must be relative images asset keys.",
  }),
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

const ProjectShapeSchema = z.object({
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

export const ProjectSchema = ProjectShapeSchema.superRefine((project, context) => {
  const addIssue = (path: (string | number)[], message: string) => {
    context.addIssue({ code: z.ZodIssueCode.custom, path, message });
  };
  const beatIds = new Set<string>();
  const beatTypeCounts = new Map<string, number>();
  const panelMembership = new Map<string, string[]>();
  const panelIds = new Set<string>();
  const panelOrders = new Set<number>();

  project.panels.forEach((panel, index) => {
    if (panelIds.has(panel.id)) {
      addIssue(["panels", index, "id"], "Panel IDs must be unique.");
    }
    panelIds.add(panel.id);
    if (panelOrders.has(panel.order)) {
      addIssue(["panels", index, "order"], "Panel orders must be unique.");
    }
    panelOrders.add(panel.order);
  });

  project.beats.forEach((beat, index) => {
    if (beatIds.has(beat.id)) {
      addIssue(["beats", index, "id"], "Beat IDs must be unique.");
    }
    beatIds.add(beat.id);
    beatTypeCounts.set(beat.type, (beatTypeCounts.get(beat.type) ?? 0) + 1);
    if (beat.panelIds.length === 0) {
      addIssue(["beats", index, "panelIds"], "Each beat must own at least one panel.");
    }
    beat.panelIds.forEach((panelId, panelIndex) => {
      if (!panelIds.has(panelId)) {
        addIssue(["beats", index, "panelIds", panelIndex], "Beat panel IDs must exist.");
      }
      const memberships = panelMembership.get(panelId) ?? [];
      memberships.push(beat.id);
      panelMembership.set(panelId, memberships);
    });
  });

  for (const beatType of BeatTypeSchema.options) {
    if (beatTypeCounts.get(beatType) !== 1) {
      addIssue(["beats"], `Project must contain exactly one ${beatType} beat.`);
    }
  }

  project.panels.forEach((panel, index) => {
    const memberships = panelMembership.get(panel.id) ?? [];
    if (memberships.length !== 1) {
      addIssue(["panels", index, "id"], "Each panel must belong to exactly one beat.");
    } else if (panel.beatId !== memberships[0]) {
      addIssue(["panels", index, "beatId"], "Panel beat ID must match its beat membership.");
    }
  });

  const validateApprovedImageVersion = (
    imageVersions: readonly ImageVersion[],
    approvedImageVersionId: string | undefined,
    path: (string | number)[],
  ) => {
    const approvedVersions = imageVersions.filter((version) => version.status === "approved");
    if (approvedImageVersionId === undefined) {
      if (approvedVersions.length > 0) {
        addIssue(path, "An approved image version ID is required for approved images.");
      }
      return;
    }

    const approvedVersion = imageVersions.find((version) => version.id === approvedImageVersionId);
    if (!approvedVersion) {
      addIssue(path, "Approved image version ID must reference an image version.");
      return;
    }
    if (approvedVersion.status !== "approved" || approvedVersions.length !== 1) {
      addIssue(path, "Approved image version ID must match exactly one approved image.");
    }
  };

  const imageVersionIds = new Set<string>();
  const validateImageVersionIds = (imageVersions: readonly ImageVersion[], path: (string | number)[]) => {
    imageVersions.forEach((imageVersion, index) => {
      if (imageVersionIds.has(imageVersion.id)) {
        addIssue([...path, index, "id"], "Image version IDs must be unique across the project.");
      }
      imageVersionIds.add(imageVersion.id);
    });
  };

  validateImageVersionIds(project.hero.imageVersions, ["hero", "imageVersions"]);
  validateApprovedImageVersion(
    project.hero.imageVersions,
    project.hero.approvedReferenceImageId,
    ["hero", "approvedReferenceImageId"],
  );
  project.panels.forEach((panel, index) => {
    validateImageVersionIds(panel.imageVersions, ["panels", index, "imageVersions"]);
    validateApprovedImageVersion(
      panel.imageVersions,
      panel.approvedImageVersionId,
      ["panels", index, "approvedImageVersionId"],
    );
  });
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
