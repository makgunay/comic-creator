import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../../../domain/project";
import {
  ComicApiError,
  type ComicApi,
  type GenerationConfigStatus,
} from "../../api/client";
import type { SaveState } from "../../state/use-project";
import { PanelCanvas } from "./PanelCanvas";
import { ImageVersionChooser } from "./ImageVersionChooser";

type TextOverlay = Project["panels"][number]["overlays"][number];

const beatLabels = {
  setup: "Setup",
  problem: "Problem",
  bigMoment: "Big Moment",
  ending: "Ending",
} as const;

const quickChanges = [
  "Closer",
  "Wider",
  "More expressive",
  "Night",
  "Day",
  "Warmer",
  "Cooler",
] as const;

function safeFailureMessage(error: unknown): string {
  return error instanceof ComicApiError
    ? error.payload.message
    : "The illustrator could not finish this version. Your current panel and words are safe. Try again.";
}

function rounded(value: number): number {
  return Number(value.toFixed(4));
}

function layoutRepeatedOverlays(
  overlays: readonly TextOverlay[],
  kind: "dialogue" | "caption",
): TextOverlay[] {
  const matching = overlays.filter((overlay) => overlay.kind === kind);
  if (matching.length <= 1) return [...overlays];

  const geometry = matching.map((_, index) => {
    if (kind === "dialogue") {
      const columns = 2;
      const rows = Math.ceil(matching.length / columns);
      const horizontalGap = .04;
      const verticalGap = Math.min(.03, .12 / (rows + 1));
      const width = (.92 - horizontalGap) / columns;
      const height = Math.min(.22, (.58 - verticalGap * (rows - 1)) / rows);
      return {
        x: rounded(.04 + (index % columns) * (width + horizontalGap)),
        y: rounded(.06 + Math.floor(index / columns) * (height + verticalGap)),
        width: rounded(width),
        height: rounded(height),
      };
    }

    const gap = Math.min(.02, .12 / (matching.length + 1));
    const height = (.32 - gap * (matching.length - 1)) / matching.length;
    return {
      x: .08,
      y: rounded(.64 + index * (height + gap)),
      width: .84,
      height: rounded(height),
    };
  });
  const byId = new Map(matching.map((overlay, index) => [
    overlay.id,
    { ...overlay, ...geometry[index]! },
  ]));
  return overlays.map((overlay) => byId.get(overlay.id) ?? overlay);
}

function drawingStatus({
  busy,
  configStatus,
  saveState,
  hasApprovedHero,
  action,
  setting,
  hasApprovedPanel,
}: {
  busy: boolean;
  configStatus: GenerationConfigStatus;
  saveState: SaveState;
  hasApprovedHero: boolean;
  action: string;
  setting: string;
  hasApprovedPanel: boolean;
}): string {
  if (busy) {
    return "Drawing your panel now. Editing and navigation stay locked until it finishes.";
  }
  if (configStatus === "loading") {
    return "Checking the art studio. Your panel directions and words still save.";
  }
  if (configStatus === "disabled") {
    return "Drawing stays off in Sample mode. Your panel directions and words still save.";
  }
  if (configStatus === "error") {
    return "The art studio could not be checked. Your panel directions and words still save.";
  }
  if (saveState === "dirty" || saveState === "saving") {
    return "Your changes are still saving. Drawing unlocks after they are saved.";
  }
  if (saveState === "loading") {
    return "Opening your saved panel before drawing.";
  }
  if (saveState === "error") {
    return "Fix the save error before drawing this panel.";
  }
  if (!hasApprovedHero) {
    return "Approve a hero first. Go to Hero, choose a candidate, and use that version.";
  }
  if (!action.trim()) {
    return "Describe what happens before drawing this panel.";
  }
  if (!setting.trim()) {
    return "Describe where they are before drawing this panel.";
  }
  return hasApprovedPanel
    ? "Ready to re-draw this panel. Your current approved image and words stay safe."
    : "Ready to draw this panel. Your words stay editable.";
}

export function PanelWorkshop({
  project,
  api,
  saveState,
  configStatus,
  onChange,
  acceptServerProject,
  onBackToStory,
  onNextToPremiere,
  onBusyChange,
}: {
  project: Project;
  api: ComicApi;
  saveState: SaveState;
  configStatus: GenerationConfigStatus;
  onChange: (project: Project) => void;
  acceptServerProject: (project: Project) => boolean;
  onBackToStory?: () => void;
  onNextToPremiere: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const panels = useMemo(
    () => [...project.panels].sort((left, right) => left.order - right.order),
    [project.panels],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [quickChange, setQuickChange] = useState("");
  const [customDirection, setCustomDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string }>();
  const mounted = useRef(false);
  const requestIdentity = useRef(0);
  const currentProjectId = useRef(project.id);
  const currentApi = useRef(api);
  currentProjectId.current = project.id;
  currentApi.current = api;
  const panel = panels[Math.min(activeIndex, panels.length - 1)]!;
  const beat = project.beats.find((item) => item.id === panel.beatId);

  useEffect(() => {
    if (activeIndex > panels.length - 1) setActiveIndex(Math.max(0, panels.length - 1));
  }, [activeIndex, panels.length]);

  useEffect(() => {
    mounted.current = true;
    requestIdentity.current += 1;
    setBusy(false);
    setNotice(undefined);
    return () => {
      mounted.current = false;
      requestIdentity.current += 1;
    };
  }, [api, project.id]);

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    setQuickChange("");
    setCustomDirection("");
    setNotice(undefined);
  }, [panel.id]);

  const updatePanel = (mutator: (current: typeof panel) => typeof panel) => {
    if (busy) return;
    onChange({
      ...project,
      panels: project.panels.map((item) => item.id === panel.id ? mutator(item) : item),
    });
  };

  const addOverlay = (kind: "dialogue" | "caption") => {
    const overlay: TextOverlay = kind === "dialogue"
      ? {
          id: globalThis.crypto.randomUUID(),
          kind,
          text: "",
          speaker: "",
          x: .06,
          y: .06,
          width: .48,
          height: .22,
        }
      : {
          id: globalThis.crypto.randomUUID(),
          kind,
          text: "",
          x: .08,
          y: .76,
          width: .84,
          height: .16,
        };
    updatePanel((current) => ({
      ...current,
      overlays: layoutRepeatedOverlays([...current.overlays, overlay], kind),
    }));
  };

  const approved = panel.imageVersions.find(
    (version) => version.id === panel.approvedImageVersionId,
  );
  const candidate = panel.imageVersions.filter((version) => version.status === "candidate").at(-1);
  const canvasVersion = approved ?? candidate;
  const drawDisabled = busy
    || configStatus !== "enabled"
    || saveState !== "saved"
    || !project.hero.approvedReferenceImageId
    || !panel.action.trim()
    || !panel.setting.trim();
  const drawStatus = drawingStatus({
    busy,
    configStatus,
    saveState,
    hasApprovedHero: Boolean(project.hero.approvedReferenceImageId),
    action: panel.action,
    setting: panel.setting,
    hasApprovedPanel: Boolean(approved),
  });

  const beginRequest = () => ({
    id: ++requestIdentity.current,
    projectId: project.id,
    panelId: panel.id,
    api,
  });
  const isCurrentRequest = (request: ReturnType<typeof beginRequest>) =>
    mounted.current
    && requestIdentity.current === request.id
    && currentProjectId.current === request.projectId
    && currentApi.current === request.api;

  const generate = async () => {
    if (drawDisabled) return;
    const request = beginRequest();
    setBusy(true);
    setNotice({
      tone: "info",
      text: "Drawing usually takes around half a minute. Your words and current image stay safe while you wait.",
    });
    try {
      const custom = customDirection.trim();
      const revisionDirection = quickChange && custom
        ? `${quickChange}: ${custom}`
        : custom || quickChange;
      const response = await request.api.generatePanel(
        request.projectId,
        request.panelId,
        { revisionDirection },
      );
      if (!isCurrentRequest(request)) return;
      if (!acceptServerProject(response.project)) {
        setNotice(undefined);
        return;
      }
      setCustomDirection("");
      setQuickChange("");
      setNotice({
        tone: "info",
        text: approved
          ? "Your newest candidate is ready. Choose it explicitly or keep the current panel."
          : "Your newest candidate is ready. Choose it explicitly or dismiss the candidate.",
      });
    } catch (error) {
      if (!isCurrentRequest(request)) return;
      try {
        const refreshed = await request.api.loadProject(request.projectId);
        if (isCurrentRequest(request)) acceptServerProject(refreshed);
      } catch {
        // The existing client project remains the safe visible fallback.
      }
      if (isCurrentRequest(request)) {
        setNotice({ tone: "error", text: safeFailureMessage(error) });
      }
    } finally {
      if (isCurrentRequest(request)) setBusy(false);
    }
  };

  const useServerAction = async (action: () => Promise<{ project: Project }>) => {
    if (busy || saveState !== "saved") return;
    const request = beginRequest();
    setBusy(true);
    setNotice(undefined);
    try {
      const response = await action();
      if (!isCurrentRequest(request)) return;
      acceptServerProject(response.project);
    } catch (error) {
      if (isCurrentRequest(request)) {
        setNotice({ tone: "error", text: safeFailureMessage(error) });
      }
    } finally {
      if (isCurrentRequest(request)) setBusy(false);
    }
  };

  return (
    <section className="panels-screen" aria-labelledby="panel-title">
      <div className="panel-workspace">
        <div className="panel-preview-column">
          <div className="panel-preview-heading">
            <span className="beat-label">{beat ? beatLabels[beat.type] : "Story"}</span>
            <strong>Panel {activeIndex + 1} of {panels.length}</strong>
          </div>
          <PanelCanvas
            panel={panel}
            {...(canvasVersion
              ? { imageUrl: api.imageUrl(project.id, canvasVersion.id) }
              : {})}
            disabled={busy}
            onOverlayChange={(id, text) => updatePanel((current) => ({
              ...current,
              overlays: current.overlays.map((overlay) => overlay.id === id
                ? { ...overlay, text }
                : overlay),
            }))}
          />
          <p className="sr-only">
            Panel summary: {panel.action || "No action yet"}. {panel.setting || "No setting yet"}.
          </p>
        </div>

        <div className="panel-director">
          <h1 id="panel-title" tabIndex={-1}>Direct panel {activeIndex + 1}</h1>
          <label>
            What happens?
            <textarea
              value={panel.action}
              disabled={busy}
              maxLength={800}
              onChange={(event) => updatePanel((current) => ({ ...current, action: event.target.value }))}
            />
          </label>
          <label>
            Where are they?
            <input
              value={panel.setting}
              disabled={busy}
              maxLength={500}
              onChange={(event) => updatePanel((current) => ({ ...current, setting: event.target.value }))}
            />
          </label>
          <div className="panel-field-grid">
            <label>
              Mood
              <input
                value={panel.mood}
                disabled={busy}
                maxLength={300}
                onChange={(event) => updatePanel((current) => ({ ...current, mood: event.target.value }))}
              />
            </label>
            <label>
              Camera
              <input
                value={panel.framing}
                disabled={busy}
                maxLength={300}
                onChange={(event) => updatePanel((current) => ({ ...current, framing: event.target.value }))}
              />
            </label>
          </div>
          <div className="overlay-actions">
            <button type="button" disabled={busy} onClick={() => addOverlay("dialogue")}>Add dialogue</button>
            <button type="button" disabled={busy} onClick={() => addOverlay("caption")}>Add caption</button>
          </div>
          <div className="quick-changes" role="group" aria-label="Quick visual changes">
            {quickChanges.map((change) => (
              <button
                type="button"
                key={change}
                disabled={busy}
                aria-pressed={quickChange === change}
                onClick={() => setQuickChange(change)}
              >
                {change}
              </button>
            ))}
          </div>
          <label>
            Tell your illustrator what to change
            <textarea
              value={customDirection}
              disabled={busy}
              maxLength={480}
              placeholder="e.g., move the kite higher, show more skyline…"
              onChange={(event) => setCustomDirection(event.target.value)}
            />
          </label>
          <button
            className="button button-primary panel-draw-button"
            type="button"
            disabled={drawDisabled}
            aria-describedby="panel-drawing-status"
            onClick={generate}
          >
            {approved ? "Re-draw panel" : "Draw my panel"}
          </button>
          <p className="drawing-status" id="panel-drawing-status">{drawStatus}</p>
          {notice ? (
            <p
              className={`drawing-notice drawing-notice-${notice.tone}`}
              role={notice.tone === "error" ? "alert" : "status"}
              aria-live={notice.tone === "error" ? "assertive" : "polite"}
            >
              {notice.text}
            </p>
          ) : null}
        </div>
      </div>

      <ImageVersionChooser
        panel={panel}
        imageUrl={(imageId) => api.imageUrl(project.id, imageId)}
        disabled={busy || saveState !== "saved"}
        onKeepCurrent={(versionId) => void useServerAction(() =>
          api.rejectPanelCandidate(project.id, panel.id, versionId))}
        onUseVersion={(versionId) => void useServerAction(() =>
          api.approvePanelVersion(project.id, panel.id, versionId))}
      />

      <nav className="panel-navigation" aria-label="Panel navigation">
        <button
          className="button button-secondary"
          type="button"
          disabled={busy}
          onClick={() => activeIndex === 0
            ? onBackToStory?.()
            : setActiveIndex((index) => Math.max(0, index - 1))}
        >
          {activeIndex === 0 ? "Previous: Story" : `Previous: Panel ${activeIndex}`}
        </button>
        <strong>Panel {activeIndex + 1} of {panels.length}</strong>
        <button
          className="button button-next button-next-blue"
          type="button"
          disabled={busy}
          onClick={() => activeIndex === panels.length - 1
            ? onNextToPremiere()
            : setActiveIndex((index) => Math.min(panels.length - 1, index + 1))}
        >
          {activeIndex === panels.length - 1
            ? "Next: Premiere"
            : `Next: Panel ${activeIndex + 2}`}
        </button>
      </nav>
    </section>
  );
}
