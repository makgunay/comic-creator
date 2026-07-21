import {
  useEffect,
  useLayoutEffect,
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
import {
  hasStaleEmbeddedLettering,
  hasUsableEmbeddedLettering,
} from "../../../domain/image-versions";

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

function approvedImageVersion(panel: Project["panels"][number]) {
  const id = panel.approvedImageVersionId;
  const version = id
    ? panel.imageVersions.find((candidate) => candidate.id === id)
    : undefined;
  return version?.status === "approved"
    && version.localPath === `images/${id}.png`
    ? version
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
  const [pageIndex, setPageIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const presentButton = useRef<HTMLButtonElement>(null);
  const presentationDialog = useRef<HTMLDivElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const wasPresenting = useRef(false);
  const mounted = useRef(false);
  const requestIdentity = useRef(0);
  const activeController = useRef<AbortController | undefined>(undefined);
  const currentProjectId = useRef(project.id);
  const currentApi = useRef(api);
  useLayoutEffect(() => {
    currentProjectId.current = project.id;
    currentApi.current = api;
  }, [api, project.id]);

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

  useEffect(() => {
    if (presenting) {
      wasPresenting.current = true;
      exitButton.current?.focus();
      return;
    }
    if (wasPresenting.current) {
      wasPresenting.current = false;
      presentButton.current?.focus();
    }
  }, [presenting]);

  useEffect(() => {
    if (!presenting) return;
    const containPresentationFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPresenting(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        presentationDialog.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!presentationDialog.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", containPresentationFocus);
    return () => document.removeEventListener("keydown", containPresentationFocus);
  }, [presenting]);

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
  const safePageIndex = Math.min(pageIndex, pages.length - 1);
  const currentPanels = pages[safePageIndex]!;
  const collaborationNames = project.collaboration?.enabled
    ? project.collaboration.authors.map((author) => author.trim()).filter(Boolean)
    : [];
  const authorCredit = collaborationNames.length > 0
    ? collaborationNames.join(" & ")
    : project.localAuthorCredit || "A new comic author";

  const page = (
    <article
      className="comic-page"
      aria-label={`Comic page ${safePageIndex + 1}`}
    >
      <div className="comic-page-grid">
        {currentPanels.map((panel) => {
          const approvedVersion = approvedImageVersion(panel);
          const staleEmbeddedLettering = hasStaleEmbeddedLettering(
            approvedVersion,
            panel.overlays,
          );
          const imageId = staleEmbeddedLettering ? undefined : approvedVersion?.id;
          const hasEmbeddedLettering = hasUsableEmbeddedLettering(
            approvedVersion,
            panel.overlays,
          );
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
                  {staleEmbeddedLettering
                    ? "Re-draw this panel after editing its word boxes before including the artwork."
                    : "Approve artwork for this panel to include it in the comic."}
                </p>
              )}
              {hasEmbeddedLettering ? (
                <span className="sr-only">
                  {panel.overlays.map((overlay) => (
                    `${overlay.kind === "dialogue" ? "Dialogue" : "Caption"}: ${overlay.text}`
                  )).join(" ")}
                </span>
              ) : panel.overlays.map((overlay) => (
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
        Page {safePageIndex + 1} of {pages.length}
      </strong>
    </article>
  );

  const pageNavigation = (
    <nav className="comic-page-navigation" aria-label="Comic page navigation">
      <button
        type="button"
        className="button button-secondary"
        disabled={safePageIndex === 0}
        onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
      >
        Previous page
      </button>
      <span aria-live="polite">{safePageIndex + 1} / {pages.length}</span>
      <button
        type="button"
        className="button button-next button-next-blue"
        disabled={safePageIndex === pages.length - 1}
        onClick={() => setPageIndex((index) => Math.min(pages.length - 1, index + 1))}
      >
        Next page
      </button>
    </nav>
  );

  return (
    <section className="premiere-screen" aria-labelledby="premiere-title">
      <div className="premiere-celebration">
        <span aria-hidden="true">★</span>
        <div>
          <strong>Your comic is ready for its premiere!</strong>
          <p>Made by you—from first idea to final panel.</p>
        </div>
        <span aria-hidden="true">★</span>
      </div>
      <div className="premiere-intro">
        <div>
          <h1 id="premiere-title" tabIndex={-1}>{project.title}</h1>
          <p className="premiere-byline">
            By {authorCredit}
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
          <button
            ref={presentButton}
            className="button button-approve"
            type="button"
            onClick={() => setPresenting(true)}
          >
            Present my comic
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
        {presenting ? null : page}
      </div>
      {presenting ? null : pageNavigation}
      <div className="premiere-reflection">
        <span aria-hidden="true">✦</span>
        <div>
          <strong>Which moment are you most proud of?</strong>
          <p>Tell someone at your premiere what you chose and why.</p>
        </div>
      </div>
      <p className="artifact-progress">
        <span aria-hidden="true">✓</span> Comic complete · {project.panels.length} panels · {pages.length} {pages.length === 1 ? "page" : "pages"}
      </p>

      {presenting ? (
        <div ref={presentationDialog} className="comic-presentation" role="dialog" aria-modal="true" aria-label="Comic presentation">
          <header>
            <div>
              <strong>{project.title}</strong>
              <span>By {authorCredit}</span>
            </div>
            <button
              ref={exitButton}
              type="button"
              className="button button-secondary"
              onClick={() => setPresenting(false)}
            >
              Exit presentation
            </button>
          </header>
          <div className="presentation-page">{page}</div>
          {pageNavigation}
        </div>
      ) : null}
    </section>
  );
}
