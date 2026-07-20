import type { Panel } from "../../../domain/project";

export function PanelCanvas({
  panel,
  imageUrl,
  onOverlayChange,
  disabled = false,
}: {
  panel: Panel;
  imageUrl?: string;
  onOverlayChange: (id: string, text: string) => void;
  disabled?: boolean;
}) {
  const overlayCounts = { dialogue: 0, caption: 0 };

  return (
    <div className="panel-canvas" aria-label={`Panel ${panel.order + 1} preview`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <div className="panel-empty">Your artwork will appear here</div>
      )}
      {panel.overlays.map((overlay) => {
        overlayCounts[overlay.kind] += 1;
        const overlayLabel = `${overlay.kind === "dialogue" ? "Dialogue" : "Caption"} ${overlayCounts[overlay.kind]}`;
        return (
          <label
            key={overlay.id}
            className={`text-overlay text-overlay-${overlay.kind}`}
            style={{
              left: `${overlay.x * 100}%`,
              top: `${overlay.y * 100}%`,
              width: `${overlay.width * 100}%`,
              minHeight: `${overlay.height * 100}%`,
            }}
          >
            <span className="sr-only">{overlayLabel}</span>
            <textarea
              aria-label={overlayLabel}
              value={overlay.text}
              disabled={disabled}
              maxLength={500}
              onChange={(event) => onOverlayChange(overlay.id, event.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
