import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  ComicApiError,
  type ComicApi,
} from "../../api/client";
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
  api,
  imageUrl,
  exportUrl,
  onBackToPanels,
}: {
  project: Project;
  api: Pick<ComicApi, "downloadPdf">;
  imageUrl: (panelId: string, imageId: string) => string;
  exportUrl: string;
  onBackToPanels: () => void;
}) {
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<
    { kind: "success" | "error"; message: string } | undefined
  >();
  const mounted = useRef(false);
  const requestIdentity = useRef(0);
  const activeController = useRef<AbortController | undefined>(undefined);
  const currentProjectId = useRef(project.id);
  const currentApi = useRef(api);
  currentProjectId.current = project.id;
  currentApi.current = api;

  useEffect(() => {
    mounted.current = true;
    setDownloadBusy(false);
    setDownloadNotice(undefined);
    return () => {
      mounted.current = false;
      requestIdentity.current += 1;
      activeController.current?.abort();
      activeController.current = undefined;
    };
  }, [api, project.id]);

  async function downloadPdf(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (downloadBusy) return;

    const projectId = project.id;
    const requestApi = api;
    const identity = ++requestIdentity.current;
    const controller = new AbortController();
    activeController.current?.abort();
    activeController.current = controller;
    const isCurrent = () =>
      mounted.current
      && requestIdentity.current === identity
      && currentProjectId.current === projectId
      && currentApi.current === requestApi;

    setDownloadBusy(true);
    setDownloadNotice(undefined);
    try {
      const result = await requestApi.downloadPdf(projectId, {
        signal: controller.signal,
      });
      if (!isCurrent()) return;

      const objectUrl = URL.createObjectURL(result.blob);
      try {
        if (!isCurrent()) return;
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = result.filename;
        anchor.hidden = true;
        document.body.append(anchor);
        try {
          anchor.click();
        } finally {
          anchor.remove();
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      if (isCurrent()) {
        setDownloadNotice({
          kind: "success",
          message: "Your PDF download is ready.",
        });
      }
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDownloadNotice({
        kind: "error",
        message: error instanceof ComicApiError
          ? error.payload.message
          : "The PDF could not be downloaded. Please try again.",
      });
    } finally {
      if (activeController.current === controller) {
        activeController.current = undefined;
      }
      if (isCurrent()) setDownloadBusy(false);
    }
  }

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
          <a
            className="button button-primary"
            href={exportUrl}
            download
            aria-busy={downloadBusy}
            aria-disabled={downloadBusy}
            onClick={downloadPdf}
          >
            <DownloadIcon />
            {downloadBusy ? "Preparing PDF…" : "Download PDF"}
          </a>
          {downloadNotice ? (
            <p
              className={`premiere-download-notice premiere-download-${downloadNotice.kind}`}
              role={downloadNotice.kind === "error" ? "alert" : "status"}
            >
              {downloadNotice.message}
            </p>
          ) : null}
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
