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
  return (
    <div className="panel-canvas" aria-label={`Panel ${panel.order + 1} preview`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <div className="panel-empty">Your artwork will appear here</div>
      )}
      {panel.overlays.map((overlay) => (
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
          <span className="sr-only">
            {overlay.kind === "dialogue" ? "Dialogue" : "Caption"}
          </span>
          <textarea
            aria-label={overlay.kind === "dialogue" ? "Dialogue" : "Caption"}
            value={overlay.text}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onOverlayChange(overlay.id, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
