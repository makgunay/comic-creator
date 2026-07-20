import type { Project } from "../../../domain/project";
import type { GenerationConfigStatus } from "../../api/client";

const sampleArtwork = new URL(
  "../../../../sample-assets/moon-kite/images/panel-1.png",
  import.meta.url,
).href;

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
      <path d="m13.8 6.7 3.5 3.5M4.8 15.7l3.5 3.5" />
    </svg>
  );
}

export function HeroWorkshop({
  project,
  configStatus,
  onChange,
}: {
  project: Project;
  configStatus: GenerationConfigStatus;
  onChange: (project: Project) => void;
}) {
  const updateDescription = (childDescription: string) => onChange({
    ...project,
    hero: { ...project.hero, childDescription },
  });
  const drawingStatus = {
    loading: "Checking the art studio. Your description still saves.",
    enabled: "Your description saves now. The art studio opens next.",
    disabled: "Your description saves in Sample mode. Drawing stays off.",
    error: "Your description still saves. The art studio could not be checked.",
  }[configStatus];

  return (
    <section className="screen-section hero-screen" aria-labelledby="hero-title">
      <div className="hero-form-panel">
        <h1 id="hero-title" tabIndex={-1}>Create your hero</h1>
        <p>Describe the character only you can imagine.</p>
        <label htmlFor="hero-description">What does your hero look like?</label>
        <textarea
          id="hero-description"
          value={project.hero.childDescription}
          onChange={(event) => updateDescription(event.target.value)}
          placeholder="Their clothes, hair, special gear, colors, and anything that makes them unmistakable…"
          maxLength={1200}
        />
        <button
          className="button button-primary draw-button"
          type="button"
          disabled
          aria-describedby="hero-drawing-status"
        >
          <PencilIcon />
          Draw my hero
        </button>
        <p className="drawing-status" id="hero-drawing-status">{drawingStatus}</p>
      </div>
      <figure className="hero-art-panel">
        <div className="hero-art-frame">
          <img src={sampleArtwork} alt="Nova holding a moon kite above the city" />
        </div>
        <figcaption>
          <strong>Sample artwork</strong>
          <span>Your hero will become the visual guide for every panel.</span>
        </figcaption>
      </figure>
    </section>
  );
}
