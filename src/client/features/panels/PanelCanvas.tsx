import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  OVERLAY_TEXT_MAX_LENGTH,
  type Panel,
} from "../../../domain/project";

type Overlay = Panel["overlays"][number];
type OverlayPosition = Pick<Overlay, "x" | "y">;

function rounded(value: number): number {
  return Number(value.toFixed(4));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function fitForOverlay(overlay: Overlay) {
  const charactersPerLine = Math.max(10, Math.floor(overlay.width * 60));
  const lines = overlay.text.split("\n").reduce((total, line) => (
    total + Math.max(1, Math.ceil([...line].length / charactersPerLine))
  ), 0);
  const rows = Math.min(6, Math.max(1, lines));
  return {
    rows,
    density: rows <= 2 ? "roomy" : rows <= 4 ? "compact" : "dense",
  } as const;
}

interface DragState {
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  latest: OverlayPosition;
}

export function PanelCanvas({
  panel,
  imageUrl,
  onOverlayChange,
  onOverlayMove,
  onOverlayRemove,
  hasEmbeddedLettering = false,
  disabled = false,
}: {
  panel: Panel;
  imageUrl?: string;
  onOverlayChange: (id: string, text: string) => void;
  onOverlayMove?: (id: string, position: OverlayPosition) => void;
  onOverlayRemove?: (id: string) => void;
  hasEmbeddedLettering?: boolean;
  disabled?: boolean;
}) {
  const overlayCounts = { dialogue: 0, caption: 0 };
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | undefined>(undefined);
  const [dragPreview, setDragPreview] = useState<({ id: string } & OverlayPosition)>();
  const [showEmbeddedEditor, setShowEmbeddedEditor] = useState(false);
  const showOverlays = !hasEmbeddedLettering || showEmbeddedEditor;

  useEffect(() => {
    setShowEmbeddedEditor(false);
    drag.current = undefined;
    setDragPreview(undefined);
  }, [hasEmbeddedLettering, panel.id]);

  const beginDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    overlay: Overlay,
  ) => {
    if (disabled || !onOverlayMove) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      id: overlay.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: overlay.x,
      startY: overlay.y,
      width: overlay.width,
      height: overlay.height,
      latest: { x: overlay.x, y: overlay.y },
    };
    setDragPreview({ id: overlay.id, x: overlay.x, y: overlay.y });
  };

  const continueDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!active || event.pointerId !== active.pointerId || !bounds?.width || !bounds.height) return;
    const position = {
      x: rounded(clamp(
        active.startX + (event.clientX - active.startClientX) / bounds.width,
        0,
        1 - active.width,
      )),
      y: rounded(clamp(
        active.startY + (event.clientY - active.startClientY) / bounds.height,
        0,
        1 - active.height,
      )),
    };
    active.latest = position;
    setDragPreview({ id: active.id, ...position });
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    drag.current = undefined;
    setDragPreview(undefined);
    onOverlayMove?.(active.id, active.latest);
  };

  return (
    <>
      <div
        className="panel-canvas"
        aria-label={`Panel ${panel.order + 1} preview`}
        ref={canvasRef}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <div className="panel-empty">Your artwork will appear here</div>
        )}
        {showOverlays ? panel.overlays.map((overlay) => {
        overlayCounts[overlay.kind] += 1;
        const overlayLabel = `${overlay.kind === "dialogue" ? "Dialogue" : "Caption"} ${overlayCounts[overlay.kind]}`;
        const preview = dragPreview?.id === overlay.id ? dragPreview : overlay;
        const fit = fitForOverlay(overlay);
        return (
          <div
            key={overlay.id}
            className={`text-overlay text-overlay-${overlay.kind}`}
            data-text-density={fit.density}
            style={{
              left: `${preview.x * 100}%`,
              top: `${preview.y * 100}%`,
              width: `${overlay.width * 100}%`,
              height: `${overlay.height * 100}%`,
              minHeight: `${overlay.height * 100}%`,
            }}
          >
            <div className="text-overlay-surface">
              <textarea
                aria-label={overlayLabel}
                value={overlay.text}
                rows={fit.rows}
                disabled={disabled}
                maxLength={OVERLAY_TEXT_MAX_LENGTH}
                onChange={(event) => onOverlayChange(overlay.id, event.target.value)}
              />
            </div>
            {onOverlayMove ? (
              <button
                className="overlay-control overlay-move"
                type="button"
                aria-label={`Move ${overlayLabel}`}
                title={`Drag to move ${overlayLabel}`}
                disabled={disabled}
                onPointerDown={(event) => beginDrag(event, overlay)}
                onPointerMove={continueDrag}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
              >
                <span aria-hidden="true">✥</span>
              </button>
            ) : null}
            {onOverlayRemove ? (
              <button
                className="overlay-control overlay-remove"
                type="button"
                aria-label={`Remove ${overlayLabel}`}
                title={`Remove ${overlayLabel}`}
                disabled={disabled}
                onClick={() => onOverlayRemove(overlay.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </div>
        );
        }) : null}
      </div>
      {hasEmbeddedLettering ? (
        <div className="embedded-lettering-tools">
          <span>Artwork contains its own lettering. Edit word boxes, then re-draw to update the artwork.</span>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={showEmbeddedEditor}
            onClick={() => setShowEmbeddedEditor((current) => !current)}
          >
            {showEmbeddedEditor ? "Preview artwork" : "Edit word boxes"}
          </button>
        </div>
      ) : null}
    </>
  );
}
