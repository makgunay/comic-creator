import type { ImageVersion, Panel, Project } from "./project";

type TextOverlay = Panel["overlays"][number];

export function letteringSnapshotForOverlays(
  overlays: readonly TextOverlay[],
): TextOverlay[] {
  return overlays
    .filter((overlay) => overlay.text.trim().length > 0)
    .map((overlay) => ({ ...overlay }));
}

export function hydrateLegacyEmbeddedLettering(project: Project): Project {
  let projectChanged = false;
  const panels = project.panels.map((panel) => {
    let panelChanged = false;
    const imageVersions = panel.imageVersions.map((version) => {
      if (
        version.letteringMode !== "embedded"
        || version.letteringSnapshot !== undefined
        || version.status !== "approved"
        || version.id !== panel.approvedImageVersionId
      ) {
        return version;
      }
      projectChanged = true;
      panelChanged = true;
      return {
        ...version,
        letteringSnapshot: letteringSnapshotForOverlays(panel.overlays),
      };
    });
    return panelChanged ? { ...panel, imageVersions } : panel;
  });
  return projectChanged ? { ...project, panels } : project;
}

export function hasMatchingEmbeddedLettering(
  version: ImageVersion | undefined,
  overlays: readonly TextOverlay[],
): boolean {
  return version?.letteringMode === "embedded"
    && version.letteringSnapshot !== undefined
    && JSON.stringify(version.letteringSnapshot)
      === JSON.stringify(letteringSnapshotForOverlays(overlays));
}

export function isEmbeddedLettering(
  version: ImageVersion | undefined,
): boolean {
  return version?.letteringMode === "embedded";
}

export function hasStaleEmbeddedLettering(
  version: ImageVersion | undefined,
  overlays: readonly TextOverlay[],
): boolean {
  return isEmbeddedLettering(version)
    && version?.letteringSnapshot !== undefined
    && !hasMatchingEmbeddedLettering(version, overlays);
}

export function hasUsableEmbeddedLettering(
  version: ImageVersion | undefined,
  overlays: readonly TextOverlay[],
): boolean {
  return isEmbeddedLettering(version)
    && !hasStaleEmbeddedLettering(version, overlays);
}

export function approveImageVersion(panel: Panel, versionId: string): Panel {
  const selectedVersions = panel.imageVersions.filter((version) => version.id === versionId);
  if (selectedVersions.length === 0) {
    throw new Error(`Unknown image version: ${versionId}`);
  }
  if (selectedVersions.length > 1) {
    throw new Error(`Duplicate image version ID: ${versionId}`);
  }
  const selected = selectedVersions[0]!;
  if (selected.status !== "candidate") {
    throw new Error(`Image version is not a candidate: ${versionId}`);
  }
  if (selected.letteringMode === "embedded" && selected.letteringSnapshot === undefined) {
    throw new Error(`Embedded lettering has no source snapshot: ${versionId}`);
  }
  if (hasStaleEmbeddedLettering(selected, panel.overlays)) {
    throw new Error(`Embedded lettering no longer matches this panel: ${versionId}`);
  }

  return {
    ...panel,
    approvedImageVersionId: versionId,
    imageVersions: panel.imageVersions.map((version) => ({
      ...version,
      status: version.id === versionId ? "approved" : "rejected",
    })),
  };
}
