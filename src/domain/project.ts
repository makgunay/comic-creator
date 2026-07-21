import { z } from "zod";
import { HeroRecipeSchema } from "./hero-recipe";
import { StyleMoodSchema } from "./style-moods";

export const PROJECT_TITLE_MAX_LENGTH = 100;
export const LOCAL_AUTHOR_CREDIT_MAX_LENGTH = 60;
export const HERO_DESCRIPTION_MAX_LENGTH = 1_200;
export const STYLE_NOTES_MAX_LENGTH = 800;
export const BEAT_TEXT_MAX_LENGTH = 800;
export const PANEL_ACTION_MAX_LENGTH = 800;
export const PANEL_SETTING_MAX_LENGTH = 500;
export const PANEL_MOOD_MAX_LENGTH = 300;
export const PANEL_FRAMING_MAX_LENGTH = 300;
export const OVERLAY_TEXT_MAX_LENGTH = 500;
export const OVERLAY_SPEAKER_MAX_LENGTH = 100;
export const PANEL_REVISION_MAX_LENGTH = 500;
export const CUSTOM_REVISION_MAX_LENGTH = 480;
export const COLLABORATOR_NAME_MAX_LENGTH = 28;
export const MAX_PANELS = 16;
export const MAX_OVERLAYS_PER_PANEL = 12;
export const MAX_HERO_IMAGE_VERSIONS = 12;
export const MAX_PANEL_IMAGE_VERSIONS = 16;

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,127}$/;
const IdSchema = z.string().regex(SAFE_ID);

export const BeatTypeSchema = z.enum(["setup", "problem", "bigMoment", "ending"]);
export const StylePresetSchema = z.enum(["cartoon", "manga", "superhero"]);
export const GenerationStatusSchema = z.enum(["idle", "generating", "failed-retryable"]);

const isRelativeImageAssetKey = (localPath: string) =>
  /^images\/[a-zA-Z0-9][a-zA-Z0-9-]{0,127}\.png$/.test(localPath);

export const TextOverlaySchema = z.object({
  id: IdSchema,
  kind: z.enum(["dialogue", "caption"]),
  text: z.string().max(OVERLAY_TEXT_MAX_LENGTH),
  speaker: z.string().max(OVERLAY_SPEAKER_MAX_LENGTH).optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
}).superRefine((overlay, context) => {
  if (overlay.x + overlay.width > 1 || overlay.y + overlay.height > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Overlay bounds must stay inside the panel.",
    });
  }
});

export const ImageVersionSchema = z.object({
  id: IdSchema,
  localPath: z.string().refine(isRelativeImageAssetKey, {
    message: "Image paths must be relative images asset keys.",
  }),
  createdAt: z.string().datetime(),
  sourceReferenceImageId: IdSchema.optional(),
  providerRequestId: z.string().max(128).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  childRevisionDirection: z.string().max(PANEL_REVISION_MAX_LENGTH),
  letteringMode: z.literal("embedded").optional(),
  letteringSnapshot: z.array(TextOverlaySchema).max(MAX_OVERLAYS_PER_PANEL).optional(),
  status: z.enum(["candidate", "approved", "rejected"]),
}).superRefine((version, context) => {
  if (version.localPath !== `images/${version.id}.png`) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["localPath"],
      message: "Image path must match its image version ID.",
    });
  }
  if (version.letteringSnapshot !== undefined && version.letteringMode !== "embedded") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["letteringSnapshot"],
      message: "Only embedded-lettering versions may store a lettering snapshot.",
    });
  }
});

export const PanelSchema = z.object({
  id: IdSchema,
  beatId: IdSchema,
  order: z.number().int().nonnegative(),
  action: z.string().max(PANEL_ACTION_MAX_LENGTH),
  setting: z.string().max(PANEL_SETTING_MAX_LENGTH),
  mood: z.string().max(PANEL_MOOD_MAX_LENGTH),
  framing: z.string().max(PANEL_FRAMING_MAX_LENGTH),
  overlays: z.array(TextOverlaySchema).max(MAX_OVERLAYS_PER_PANEL),
  approvedImageVersionId: IdSchema.optional(),
  imageVersions: z.array(ImageVersionSchema).max(MAX_PANEL_IMAGE_VERSIONS),
  generationStatus: GenerationStatusSchema,
});

export const BeatSchema = z.object({
  id: IdSchema,
  type: BeatTypeSchema,
  childText: z.string().max(BEAT_TEXT_MAX_LENGTH),
  panelIds: z.array(IdSchema).min(1).max(MAX_PANELS),
});

const ProjectShapeSchema = z.object({
  id: IdSchema,
  schemaVersion: z.literal(1),
  title: z.string().min(1).max(PROJECT_TITLE_MAX_LENGTH),
  localAuthorCredit: z.string().max(LOCAL_AUTHOR_CREDIT_MAX_LENGTH),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  hero: z.object({
    childDescription: z.string().max(HERO_DESCRIPTION_MAX_LENGTH),
    recipe: HeroRecipeSchema.optional(),
    approvedReferenceImageId: IdSchema.optional(),
    imageVersions: z.array(ImageVersionSchema).max(MAX_HERO_IMAGE_VERSIONS),
  }),
  visualStyle: z.object({
    presetId: StylePresetSchema,
    baselineNotes: z.string().max(STYLE_NOTES_MAX_LENGTH),
    editedNotes: z.string().max(STYLE_NOTES_MAX_LENGTH),
    moods: z.array(StyleMoodSchema).max(2).optional(),
  }),
  collaboration: z.strictObject({
    enabled: z.boolean(),
    authors: z.tuple([
      z.string().max(COLLABORATOR_NAME_MAX_LENGTH),
      z.string().max(COLLABORATOR_NAME_MAX_LENGTH),
    ]),
    activeAuthorIndex: z.union([z.literal(0), z.literal(1)]),
  }).optional(),
  beats: z.array(BeatSchema).length(4),
  panels: z.array(PanelSchema).min(4).max(MAX_PANELS),
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
    const overlayIds = new Set<string>();
    panel.overlays.forEach((overlay, overlayIndex) => {
      if (overlayIds.has(overlay.id)) {
        addIssue(
          ["panels", index, "overlays", overlayIndex, "id"],
          "Overlay IDs must be unique within a panel.",
        );
      }
      overlayIds.add(overlay.id);
    });
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
  const heroImageVersionIds = new Set(
    project.hero.imageVersions.map((version) => version.id),
  );
  project.hero.imageVersions.forEach((version, index) => {
    if (version.letteringMode !== undefined) {
      addIssue(
        ["hero", "imageVersions", index, "letteringMode"],
        "Hero image versions cannot contain panel lettering.",
      );
    }
    if (version.sourceReferenceImageId !== undefined) {
      addIssue(
        ["hero", "imageVersions", index, "sourceReferenceImageId"],
        "Hero image versions cannot have a source reference.",
      );
    }
  });
  validateApprovedImageVersion(
    project.hero.imageVersions,
    project.hero.approvedReferenceImageId,
    ["hero", "approvedReferenceImageId"],
  );
  project.panels.forEach((panel, index) => {
    validateImageVersionIds(panel.imageVersions, ["panels", index, "imageVersions"]);
    panel.imageVersions.forEach((version, versionIndex) => {
      if (
        version.sourceReferenceImageId !== undefined
        && !heroImageVersionIds.has(version.sourceReferenceImageId)
      ) {
        addIssue(
          ["panels", index, "imageVersions", versionIndex, "sourceReferenceImageId"],
          "Panel source references must exist in hero image history.",
        );
      }
    });
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

export const CreateProjectInputSchema = z.strictObject({
  title: z.string().min(1).max(PROJECT_TITLE_MAX_LENGTH),
  localAuthorCredit: z.string().max(LOCAL_AUTHOR_CREDIT_MAX_LENGTH),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export function createProject(input: unknown): Project {
  const validInput = CreateProjectInputSchema.parse(input);
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
    title: validInput.title,
    localAuthorCredit: validInput.localAuthorCredit,
    createdAt: now,
    updatedAt: now,
    hero: {
      childDescription: "",
      recipe: {
        mode: "guided",
        appearance: "",
        outfit: "",
        special: "",
        personality: "",
      },
      imageVersions: [],
    },
    visualStyle: {
      presetId: "cartoon",
      baselineNotes: cartoonNotes,
      editedNotes: cartoonNotes,
      moods: [],
    },
    collaboration: {
      enabled: false,
      authors: [validInput.localAuthorCredit.slice(0, COLLABORATOR_NAME_MAX_LENGTH), ""],
      activeAuthorIndex: 0,
    },
    beats,
    panels,
  });
}

export function addPanelToBeat(
  project: Project,
  beatId: string,
  createId: () => string = () => globalThis.crypto.randomUUID(),
): Project {
  const valid = ProjectSchema.parse(project);
  if (valid.panels.length >= MAX_PANELS) {
    throw new Error(`The comic has reached the ${MAX_PANELS}-panel maximum.`);
  }
  const beat = valid.beats.find((candidate) => candidate.id === beatId);
  if (!beat) throw new Error("The selected story beat does not exist.");
  const members = new Set(beat.panelIds);
  const lastBeatOrder = Math.max(
    ...valid.panels
      .filter((panel) => members.has(panel.id))
      .map((panel) => panel.order),
  );
  const id = createId();
  const panel: Panel = {
    id,
    beatId,
    order: lastBeatOrder + 1,
    action: "",
    setting: "",
    mood: "",
    framing: "",
    overlays: [],
    imageVersions: [],
    generationStatus: "idle",
  };
  const orderedPanels = valid.panels
    .map((candidate) => candidate.order > lastBeatOrder
      ? { ...candidate, order: candidate.order + 1 }
      : candidate)
    .concat(panel)
    .sort((left, right) => left.order - right.order);

  return ProjectSchema.parse({
    ...valid,
    beats: valid.beats.map((candidate) => candidate.id === beatId
      ? { ...candidate, panelIds: [...candidate.panelIds, id] }
      : candidate),
    panels: orderedPanels,
  });
}
