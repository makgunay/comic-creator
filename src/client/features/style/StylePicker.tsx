import {
  STYLE_NOTES_MAX_LENGTH,
  type Project,
} from "../../../domain/project";

const sampleArtwork = new URL(
  "../../../../sample-assets/moon-kite/images/sample-art-1.png",
  import.meta.url,
).href;

export const STYLE_PRESETS = {
  cartoon: {
    label: "Cartoon",
    description: "Warm color, bold shapes, and expressive faces.",
    prompt: "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
  },
  manga: {
    label: "Manga",
    description: "Crisp lines, lively motion, and dramatic expressions.",
    prompt: "Crisp manga ink, dynamic motion, expressive eyes, selective color.",
  },
  superhero: {
    label: "Superhero",
    description: "Big perspective, strong shadows, and heroic color.",
    prompt: "Strong shadows, dramatic perspective, saturated heroic color, bold anatomy.",
  },
} as const;

type Style = Project["visualStyle"];

export function StylePicker({
  value,
  onChange,
}: {
  value: Style;
  onChange: (value: Style) => void;
}) {
  const select = (presetId: keyof typeof STYLE_PRESETS) => {
    const prompt = STYLE_PRESETS[presetId].prompt;
    onChange({ presetId, baselineNotes: prompt, editedNotes: prompt });
  };

  return (
    <section className="screen-section style-screen" aria-labelledby="style-title">
      <header className="screen-heading">
        <h1 id="style-title" tabIndex={-1}>Choose your comic’s look</h1>
        <p>Pick a starting style, then make the art direction your own.</p>
      </header>
      <div className="style-choice-grid">
        {(Object.keys(STYLE_PRESETS) as (keyof typeof STYLE_PRESETS)[]).map((id) => {
          const preset = STYLE_PRESETS[id];
          return (
            <button
              className={`style-choice style-${id}`}
              type="button"
              key={id}
              aria-label={preset.label}
              aria-pressed={value.presetId === id}
              onClick={() => select(id)}
            >
              <span className="style-swatch" aria-hidden="true">
                <img src={sampleArtwork} alt="" />
              </span>
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          );
        })}
      </div>
      <div className="style-notes-panel">
        <div>
          <label htmlFor="style-notes">Style notes</label>
          <p>Describe line, color, texture, and mood in your own words.</p>
        </div>
        <textarea
          id="style-notes"
          value={value.editedNotes}
          onChange={(event) => onChange({ ...value, editedNotes: event.target.value })}
          maxLength={STYLE_NOTES_MAX_LENGTH}
        />
        <button
          className="button button-small button-secondary"
          type="button"
          onClick={() => onChange({ ...value, editedNotes: value.baselineNotes })}
        >
          Reset style notes
        </button>
      </div>
    </section>
  );
}
