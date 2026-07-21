import type { ImageVersion, Panel } from "../../../domain/project";

function newestCandidate(panel: Panel): ImageVersion | undefined {
  return panel.imageVersions.filter((version) => version.status === "candidate").at(-1);
}

export function ImageVersionChooser({
  panel,
  imageUrl,
  disabled,
  onKeepCurrent,
  onUseVersion,
}: {
  panel: Panel;
  imageUrl: (imageId: string) => string;
  disabled: boolean;
  onKeepCurrent: (versionId: string) => void;
  onUseVersion: (versionId: string) => void;
}) {
  const approved = panel.imageVersions.find(
    (version) => version.id === panel.approvedImageVersionId,
  );
  const candidate = newestCandidate(panel);
  if (!approved && !candidate) return null;

  return (
    <section className="version-chooser" aria-labelledby="panel-versions-title">
      <h2 id="panel-versions-title">Panel versions</h2>
      <div className="version-grid">
        {approved ? (
          <article className="version-card version-current">
            <div className="version-image-frame">
              <img src={imageUrl(approved.id)} alt="" />
            </div>
            <div>
              <strong>Current (approved)</strong>
              <p>{approved.letteringMode === "embedded"
                ? "Your approved panel with experimental lettering."
                : "Your approved panel."}</p>
            </div>
          </article>
        ) : null}
        {candidate ? (
          <article className="version-card version-candidate">
            <div className="version-image-frame">
              <img src={imageUrl(candidate.id)} alt="" />
            </div>
            <div>
              <strong>Newest candidate</strong>
              <p>{candidate.childRevisionDirection || (candidate.letteringMode === "embedded"
                ? "A new version with experimental lettering."
                : "A new art-only version.")}</p>
            </div>
          </article>
        ) : null}
        {candidate ? (
          <div className="version-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={disabled}
              onClick={() => onKeepCurrent(candidate.id)}
            >
              {approved ? "Keep current" : "Dismiss candidate"}
            </button>
            <button
              className="button button-approve"
              type="button"
              disabled={disabled}
              onClick={() => onUseVersion(candidate.id)}
            >
              Use this version
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
