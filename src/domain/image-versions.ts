import type { Panel } from "./project";

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

  return {
    ...panel,
    approvedImageVersionId: versionId,
    imageVersions: panel.imageVersions.map((version) => ({
      ...version,
      status: version.id === versionId ? "approved" : "rejected",
    })),
  };
}
