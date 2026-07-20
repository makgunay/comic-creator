import type { Project } from "../../../domain/project";
import { paginatePanels } from "../../../domain/pagination";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5m5 6-6-6 6-6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3" />
    </svg>
  );
}

function approvedImageId(panel: Project["panels"][number]): string | undefined {
  const id = panel.approvedImageVersionId;
  const version = id
    ? panel.imageVersions.find((candidate) => candidate.id === id)
    : undefined;
  return version?.status === "approved"
    && version.localPath === `images/${id}.png`
    ? id
    : undefined;
}

export function ComicPreview({
  project,
  imageUrl,
  exportUrl,
  onBackToPanels,
}: {
  project: Project;
  imageUrl: (panelId: string, imageId: string) => string;
  exportUrl: string;
  onBackToPanels: () => void;
}) {
  const pages = paginatePanels(project.panels);
  return (
    <section className="premiere-screen" aria-labelledby="premiere-title">
      <div className="premiere-intro">
        <div>
          <h1 id="premiere-title" tabIndex={-1}>{project.title}</h1>
          <p className="premiere-byline">
            By {project.localAuthorCredit || "A new comic author"}
          </p>
        </div>
        <div className="premiere-controls">
          <button
            className="button button-secondary"
            type="button"
            onClick={onBackToPanels}
          >
            <ArrowIcon />
            Back to panels
          </button>
          <a className="button button-primary" href={exportUrl} download>
            <DownloadIcon />
            Download PDF
          </a>
        </div>
      </div>
      <div className="comic-pages">
        {pages.map((panels, pageIndex) => (
          <article
            className="comic-page"
            aria-label={`Comic page ${pageIndex + 1}`}
            key={pageIndex}
          >
            <div className="comic-page-grid">
              {panels.map((panel) => {
                const imageId = approvedImageId(panel);
                return (
                  <section
                    className="comic-panel"
                    aria-label={`Panel ${panel.order + 1}`}
                    key={panel.id}
                  >
                    {imageId ? (
                      <img
                        src={imageUrl(panel.id, imageId)}
                        alt={`Approved artwork for panel ${panel.order + 1}`}
                      />
                    ) : (
                      <p className="comic-panel-placeholder">
                        Approve artwork for this panel to include it in the comic.
                      </p>
                    )}
                    {panel.overlays.map((overlay) => (
                      <div
                        className={`comic-overlay comic-overlay-${overlay.kind}`}
                        key={overlay.id}
                        style={{
                          left: `${overlay.x * 100}%`,
                          top: `${overlay.y * 100}%`,
                          width: `${overlay.width * 100}%`,
                          minHeight: `${overlay.height * 100}%`,
                        }}
                      >
                        {overlay.text}
                      </div>
                    ))}
                  </section>
                );
              })}
            </div>
            <strong className="comic-page-number">
              Page {pageIndex + 1} of {pages.length}
            </strong>
          </article>
        ))}
      </div>
    </section>
  );
}
