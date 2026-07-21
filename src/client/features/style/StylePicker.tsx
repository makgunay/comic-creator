import { useState } from "react";
import {
  STYLE_NOTES_MAX_LENGTH,
  type Project,
} from "../../../domain/project";
import {
  compileStyleMoods,
  type StyleMood,
} from "../../../domain/style-moods";

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

const STYLE_MOODS: Array<{ id: StyleMood; label: string; symbol: string }> = [
  { id: "funny", label: "Funny", symbol: "Ha!" },
  { id: "dramatic", label: "Dramatic", symbol: "!" },
  { id: "dreamy", label: "Dreamy", symbol: "☁" },
  { id: "mysterious", label: "Mysterious", symbol: "?" },
  { id: "colorful", label: "Colorful", symbol: "✦" },
];

export function StylePicker({
  value,
  onChange,
}: {
  value: Style;
  onChange: (value: Style) => void;
}) {
  const [showFineTune, setShowFineTune] = useState(false);
  const moods = value.moods ?? [];

  const select = (presetId: keyof typeof STYLE_PRESETS) => {
    const prompt = STYLE_PRESETS[presetId].prompt;
    onChange({ presetId, baselineNotes: prompt, editedNotes: prompt, moods: [] });
  };

  const toggleMood = (mood: StyleMood) => {
    const nextMoods = moods.includes(mood)
      ? moods.filter((selected) => selected !== mood)
      : [...moods, mood];
    onChange({
      ...value,
      moods: nextMoods,
      editedNotes: compileStyleMoods(value.baselineNotes, nextMoods),
    });
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

      <section className="style-mood-panel" aria-labelledby="style-mood-title">
        <div className="guided-section-heading">
          <div>
            <p className="step-kicker">Step 2</p>
            <h2 id="style-mood-title">How should it feel?</h2>
          </div>
          <span>{moods.length}/2 picked</span>
        </div>
        <p>Choose up to two. Your choices guide the art without writing your story.</p>
        <div className="style-mood-grid">
          {STYLE_MOODS.map((mood) => {
            const selected = moods.includes(mood.id);
            return (
              <button
                key={mood.id}
                type="button"
                className="style-mood-choice"
                aria-pressed={selected}
                disabled={!selected && moods.length >= 2}
                onClick={() => toggleMood(mood.id)}
              >
                <span aria-hidden="true">{mood.symbol}</span>
                {mood.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="style-summary" aria-live="polite">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Your style</strong>
          <p>{value.editedNotes || "Pick a look and a feeling to build your style."}</p>
        </div>
      </div>

      {!showFineTune ? (
        <button
          className="button button-small button-secondary style-fine-tune-toggle"
          type="button"
          onClick={() => setShowFineTune(true)}
        >
          Fine-tune the words
        </button>
      ) : (
        <div className="style-notes-panel">
          <div>
            <label htmlFor="style-notes">Fine-tune your style words</label>
            <p>Change the description if you know exactly what you want.</p>
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
            onClick={() => onChange({
              ...value,
              editedNotes: compileStyleMoods(value.baselineNotes, moods),
            })}
          >
            Use my choices
          </button>
        </div>
      )}
      <p className="artifact-progress"><span aria-hidden="true">✓</span> Look chosen · Next: plan your story</p>
    </section>
  );
}
