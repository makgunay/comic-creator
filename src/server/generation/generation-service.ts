import { randomUUID } from "node:crypto";
import { approveImageVersion } from "../../domain/image-versions";
import {
  ProjectSchema,
  type ImageVersion,
  type Project,
} from "../../domain/project";
import { ProjectStore } from "../storage/project-store";
import {
  VisualInputSchema,
  type GeneratedImage,
  type GenerationProvider,
  type VisualInput,
} from "./contracts";
import { buildImagePrompt } from "./prompt-builder";

function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() };
}

function findPanel(project: Project, panelId: string) {
  const panel = project.panels.find((item) => item.id === panelId);
  if (!panel) throw codedError("not_found", "Panel not found");
  return panel;
}

function findVersion(
  versions: readonly ImageVersion[],
  versionId: string,
  label: string,
): ImageVersion {
  const version = versions.find((item) => item.id === versionId);
  if (!version) throw codedError("not_found", `${label} image not found`);
  return version;
}

export interface HeroApprovalResult {
  project: Project;
  heroReferenceChanged: boolean;
}

export class GenerationService {
  private readonly activeProjects = new Set<string>();

  constructor(
    private readonly store: ProjectStore,
    private readonly provider: GenerationProvider,
  ) {}

  private async exclusive<T>(projectId: string, work: () => Promise<T>): Promise<T> {
    if (this.activeProjects.has(projectId)) {
      throw codedError("rate_limit", "Generation already active");
    }
    this.activeProjects.add(projectId);
    try {
      return await work();
    } finally {
      this.activeProjects.delete(projectId);
    }
  }

  private async publishAndMutate(
    projectId: string,
    generated: GeneratedImage,
    mutate: (project: Project, imageId: string) => Project,
  ): Promise<Project> {
    const imageId = randomUUID();
    await this.store.publishImageAsset(projectId, imageId, generated.bytes);
    try {
      return await this.store.mutate(projectId, (latest) =>
        ProjectSchema.parse(touch(mutate(latest, imageId))));
    } catch (error) {
      try {
        await this.store.quarantineImageAsset(projectId, imageId);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "Project mutation and orphan recovery both failed",
        );
      }
      throw error;
    }
  }

  private async markPanelFailed(projectId: string, panelId: string): Promise<void> {
    try {
      await this.store.mutate(projectId, (latest) => touch({
        ...latest,
        panels: latest.panels.map((panel) => panel.id === panelId
          ? { ...panel, generationStatus: "failed-retryable" as const }
          : panel),
      }));
    } catch {
      // Preserve the primary generation error. Storage recovery remains available
      // through the previous valid document if this best-effort status write fails.
    }
  }

  async generatePanel(
    projectId: string,
    panelId: string,
    revisionDirection: string,
  ): Promise<Project> {
    return this.exclusive(projectId, async () => {
      const started = await this.store.mutate(projectId, (latest) => {
        const panel = findPanel(latest, panelId);
        if (!latest.hero.approvedReferenceImageId) {
          throw codedError("invalid_input", "Approve a hero before drawing panels");
        }
        return touch({
          ...latest,
          panels: latest.panels.map((item) => item.id === panel.id
            ? { ...item, generationStatus: "generating" as const }
            : item),
        });
      });

      try {
        const panel = findPanel(started, panelId);
        const referenceId = started.hero.approvedReferenceImageId!;
        const visualInput: VisualInput = VisualInputSchema.parse({
          heroDescription: started.hero.childDescription,
          action: panel.action,
          setting: panel.setting,
          mood: panel.mood,
          framing: panel.framing,
          styleNotes: started.visualStyle.editedNotes,
          revisionDirection,
        });
        await this.provider.moderate(Object.values(visualInput).join("\n"));
        const choices = await this.provider.chooseRendering(visualInput);
        const generated = await this.provider.generatePanel(
          await this.store.resolveImageAsset(projectId, referenceId),
          buildImagePrompt(visualInput, choices),
        );
        return await this.publishAndMutate(projectId, generated, (latest, imageId) => {
          const latestPanel = findPanel(latest, panelId);
          const candidate: ImageVersion = {
            id: imageId,
            localPath: `images/${imageId}.png`,
            createdAt: new Date().toISOString(),
            sourceReferenceImageId: referenceId,
            ...(generated.providerRequestId
              ? { providerRequestId: generated.providerRequestId }
              : {}),
            durationMs: generated.durationMs,
            childRevisionDirection: revisionDirection,
            status: "candidate",
          };
          return {
            ...latest,
            panels: latest.panels.map((item) => item.id === latestPanel.id
              ? {
                  ...latestPanel,
                  generationStatus: "idle" as const,
                  imageVersions: [...latestPanel.imageVersions, candidate],
                }
              : item),
          };
        });
      } catch (error) {
        await this.markPanelFailed(projectId, panelId);
        throw error;
      }
    });
  }

  async generateHero(projectId: string): Promise<Project> {
    return this.exclusive(projectId, async () => {
      const started = await this.store.load(projectId);
      if (!started.hero.childDescription.trim()) {
        throw codedError("invalid_input", "Describe the hero before drawing");
      }
      const heroFacts = VisualInputSchema.parse({
        heroDescription: started.hero.childDescription,
        action: "",
        setting: "",
        mood: "",
        framing: "full-body character reference",
        styleNotes: started.visualStyle.editedNotes,
        revisionDirection: "",
      });
      await this.provider.moderate([
        heroFacts.heroDescription,
        heroFacts.styleNotes,
      ].join("\n"));
      const generated = await this.provider.generateHero([
        "Create one square full-body comic character reference on a plain pale background.",
        `Child-authored hero, preserve exactly: ${heroFacts.heroDescription}`,
        `Art style: ${heroFacts.styleNotes}`,
        "No text, letters, speech bubbles, logo, watermark, new character, plot event, or story setting.",
      ].join("\n"));
      return this.publishAndMutate(projectId, generated, (latest, imageId) => ({
        ...latest,
        hero: {
          ...latest.hero,
          imageVersions: [
            ...latest.hero.imageVersions,
            {
              id: imageId,
              localPath: `images/${imageId}.png`,
              createdAt: new Date().toISOString(),
              ...(generated.providerRequestId
                ? { providerRequestId: generated.providerRequestId }
                : {}),
              durationMs: generated.durationMs,
              childRevisionDirection: "",
              status: "candidate" as const,
            },
          ],
        },
      }));
    });
  }

  async approveHero(projectId: string, imageId: string): Promise<HeroApprovalResult> {
    let heroReferenceChanged = false;
    const project = await this.store.mutate(projectId, (latest) => {
      const selected = findVersion(latest.hero.imageVersions, imageId, "Hero");
      if (selected.status === "rejected") {
        throw codedError("invalid_input", "Rejected hero versions cannot be approved");
      }
      if (selected.status === "approved") return latest;
      heroReferenceChanged = Boolean(
        latest.hero.approvedReferenceImageId
        && latest.hero.approvedReferenceImageId !== imageId,
      );
      return touch({
        ...latest,
        hero: {
          ...latest.hero,
          approvedReferenceImageId: imageId,
          imageVersions: latest.hero.imageVersions.map((version) => ({
            ...version,
            status: version.id === imageId ? "approved" as const : "rejected" as const,
          })),
        },
      });
    });
    return { project, heroReferenceChanged };
  }

  async rejectHeroCandidate(projectId: string, imageId: string): Promise<Project> {
    return this.store.mutate(projectId, (latest) => {
      const selected = findVersion(latest.hero.imageVersions, imageId, "Hero");
      if (selected.status !== "candidate") {
        throw codedError("invalid_input", "Only a hero candidate can be dismissed");
      }
      return touch({
        ...latest,
        hero: {
          ...latest.hero,
          imageVersions: latest.hero.imageVersions.map((version) => version.id === imageId
            ? { ...version, status: "rejected" as const }
            : version),
        },
      });
    });
  }

  async approvePanelVersion(
    projectId: string,
    panelId: string,
    versionId: string,
  ): Promise<Project> {
    return this.store.mutate(projectId, (latest) => {
      const panel = findPanel(latest, panelId);
      findVersion(panel.imageVersions, versionId, "Panel");
      let approved;
      try {
        approved = approveImageVersion(panel, versionId);
      } catch {
        throw codedError("invalid_input", "Only a panel candidate can be approved");
      }
      return touch({
        ...latest,
        panels: latest.panels.map((item) => item.id === panelId ? approved : item),
      });
    });
  }

  async rejectPanelCandidate(
    projectId: string,
    panelId: string,
    versionId: string,
  ): Promise<Project> {
    return this.store.mutate(projectId, (latest) => {
      const panel = findPanel(latest, panelId);
      const selected = findVersion(panel.imageVersions, versionId, "Panel");
      if (selected.status !== "candidate") {
        throw codedError("invalid_input", "Only a panel candidate can be dismissed");
      }
      return touch({
        ...latest,
        panels: latest.panels.map((item) => item.id === panelId
          ? {
              ...item,
              imageVersions: item.imageVersions.map((version) => version.id === versionId
                ? { ...version, status: "rejected" as const }
                : version),
            }
          : item),
      });
    });
  }
}
