import type { Panel } from "./project";

export function approveImageVersion(panel: Panel, versionId: string): Panel {
  const selected = panel.imageVersions.find((version) => version.id === versionId);
  if (!selected) {
    throw new Error(`Unknown image version: ${versionId}`);
  }
  if (selected.status !== "candidate") {
    throw new Error(`Image version is not a candidate: ${versionId}`);
  }

  return {
    ...panel,
    approvedImageVersionId: versionId,
    imageVersions: panel.imageVersions.map((version) => ({
      ...version,
      status: version.id === versionId ? "approved" : version.status === "approved" ? "rejected" : version.status,
    })),
  };
}
