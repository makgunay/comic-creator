import { useEffect, useRef, useState } from "react";
import {
  HERO_DESCRIPTION_MAX_LENGTH,
  type ImageVersion,
  type Project,
} from "../../../domain/project";
import {
  HERO_RECIPE_FIELD_MAX_LENGTH,
  compileHeroRecipe,
  type HeroRecipe,
} from "../../../domain/hero-recipe";
import {
  ComicApiError,
  type ComicApi,
  type GenerationConfigStatus,
} from "../../api/client";
import type { SaveState } from "../../state/use-project";

const sampleArtwork = new URL(
  "../../../../sample-assets/moon-kite/images/sample-art-1.png",
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
  saveState,
  api,
  onChange,
  acceptServerProject,
  onBusyChange,
}: {
  project: Project;
  configStatus: GenerationConfigStatus;
  saveState: SaveState;
  api: ComicApi;
  onChange: (project: Project) => void;
  acceptServerProject: (project: Project) => boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string }>();
  const mounted = useRef(false);
  const requestIdentity = useRef(0);
  const currentProjectId = useRef(project.id);
  const currentApi = useRef(api);
  currentProjectId.current = project.id;
  currentApi.current = api;

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
  const approved = project.hero.imageVersions.find(
    (version) => version.id === project.hero.approvedReferenceImageId,
  );
  const candidate = newestCandidate(project.hero.imageVersions);
  const fallbackPanelVersion = project.panels
    .flatMap((panel) => panel.imageVersions)
    .find((version) => version.status === "approved");
  const featured = approved ?? candidate ?? fallbackPanelVersion;
  const featuredUrl = featured
    ? api.imageUrl(project.id, featured.id)
    : sampleArtwork;
  const canMutateServer = configStatus === "enabled"
    && saveState === "saved"
    && !busy;
  const canDraw = canMutateServer && Boolean(project.hero.childDescription.trim());
  const recipe: HeroRecipe = project.hero.recipe ?? {
    mode: project.hero.childDescription.trim() ? "freeform" : "guided",
    appearance: "",
    outfit: "",
    special: "",
    personality: "",
  };

  const beginRequest = () => ({
    id: ++requestIdentity.current,
    projectId: project.id,
    api,
  });
  const isCurrentRequest = (request: ReturnType<typeof beginRequest>) =>
    mounted.current
    && requestIdentity.current === request.id
    && currentProjectId.current === request.projectId
    && currentApi.current === request.api;

  const updateDescription = (childDescription: string) => {
    if (busy) return;
    onChange({
      ...project,
      hero: {
        ...project.hero,
        recipe: { ...recipe, mode: "freeform" },
        childDescription,
      },
    });
  };

  const updateRecipe = (
    field: "appearance" | "outfit" | "special" | "personality",
    value: string,
  ) => {
    if (busy) return;
    const nextRecipe: HeroRecipe = {
      ...recipe,
      mode: "guided",
      [field]: value,
    };
    onChange({
      ...project,
      hero: {
        ...project.hero,
        recipe: nextRecipe,
        childDescription: compileHeroRecipe(nextRecipe),
      },
    });
  };

  const setRecipeMode = (mode: HeroRecipe["mode"]) => {
    if (busy) return;
    const nextRecipe = { ...recipe, mode };
    onChange({
      ...project,
      hero: {
        ...project.hero,
        recipe: nextRecipe,
        childDescription: mode === "guided"
          ? compileHeroRecipe(nextRecipe)
          : project.hero.childDescription,
      },
    });
  };

  const safeMessage = (error: unknown) => error instanceof ComicApiError
    ? error.payload.message
    : "The illustrator could not finish this version. Your description and current hero are safe.";

  const generate = async () => {
    if (!canDraw) return;
    const request = beginRequest();
    setBusy(true);
    setNotice({
      tone: "info",
      text: "Drawing usually takes around half a minute. Your description and current hero stay safe while you wait.",
    });
    try {
      const response = await request.api.generateHero(request.projectId);
      if (!isCurrentRequest(request)) return;
      if (!acceptServerProject(response.project)) {
        setNotice(undefined);
        return;
      }
      setNotice({
        tone: "info",
        text: approved
          ? "A new candidate is ready. Choose it explicitly or keep your current hero."
          : "A new candidate is ready. Choose it explicitly or dismiss the candidate.",
      });
    } catch (error) {
      if (isCurrentRequest(request)) {
        setNotice({ tone: "error", text: safeMessage(error) });
      }
    } finally {
      if (isCurrentRequest(request)) setBusy(false);
    }
  };

  const approve = async (imageId: string) => {
    if (!canMutateServer) return;
    const request = beginRequest();
    setBusy(true);
    setNotice(undefined);
    try {
      const response = await request.api.approveHero(request.projectId, imageId);
      if (!isCurrentRequest(request)) return;
      if (!acceptServerProject(response.project)) {
        setNotice(undefined);
        return;
      }
      setNotice({
        tone: "info",
        text: response.heroReferenceChanged
          ? "Hero updated. Existing panels stay unchanged; future panels follow the new hero."
          : "This hero is now your approved reference.",
      });
    } catch (error) {
      if (isCurrentRequest(request)) {
        setNotice({ tone: "error", text: safeMessage(error) });
      }
    } finally {
      if (isCurrentRequest(request)) setBusy(false);
    }
  };

  const reject = async (imageId: string) => {
    if (!canMutateServer) return;
    const request = beginRequest();
    setBusy(true);
    setNotice(undefined);
    try {
      const response = await request.api.rejectHeroCandidate(request.projectId, imageId);
      if (!isCurrentRequest(request)) return;
      if (!acceptServerProject(response.project)) {
        setNotice(undefined);
        return;
      }
      setNotice({
        tone: "info",
        text: approved
          ? "Kept the current hero. The dismissed candidate remains in version history."
          : "Dismissed this candidate. It remains in version history.",
      });
    } catch (error) {
      if (isCurrentRequest(request)) {
        setNotice({ tone: "error", text: safeMessage(error) });
      }
    } finally {
      if (isCurrentRequest(request)) setBusy(false);
    }
  };

  const drawingStatus = {
    loading: "Checking the art studio. Your description still saves.",
    enabled: saveState === "saved"
      ? "Ready when your hero description feels unmistakable."
      : "Finish saving your description before drawing.",
    disabled: "Your description saves in Sample mode. Drawing stays off.",
    error: "Your description still saves. The art studio could not be checked.",
  }[configStatus];

  return (
    <section className="screen-section hero-screen" aria-labelledby="hero-title">
      <div className="hero-form-panel">
        <h1 id="hero-title" tabIndex={-1}>Create your hero</h1>
        <p>Build the character only you can imagine.</p>
        {recipe.mode === "guided" ? (
          <div className="hero-recipe">
            <h2>Hero recipe</h2>
            <label>
              What do they look like?
              <textarea
                value={recipe.appearance}
                disabled={busy}
                maxLength={HERO_RECIPE_FIELD_MAX_LENGTH}
                placeholder="Hair, face, colors, size, or anything you notice first…"
                onChange={(event) => updateRecipe("appearance", event.target.value)}
              />
            </label>
            <label>
              What are they wearing?
              <textarea
                value={recipe.outfit}
                disabled={busy}
                maxLength={HERO_RECIPE_FIELD_MAX_LENGTH}
                placeholder="Clothes, shoes, costume, armor, or favorite colors…"
                onChange={(event) => updateRecipe("outfit", event.target.value)}
              />
            </label>
            <label>
              What makes them special?
              <textarea
                value={recipe.special}
                disabled={busy}
                maxLength={HERO_RECIPE_FIELD_MAX_LENGTH}
                placeholder="A tool, power, pet, accessory, or unforgettable detail…"
                onChange={(event) => updateRecipe("special", event.target.value)}
              />
            </label>
            <label>
              What are they like?
              <textarea
                value={recipe.personality}
                disabled={busy}
                maxLength={HERO_RECIPE_FIELD_MAX_LENGTH}
                placeholder="Curious, brave, funny, quiet, energetic…"
                onChange={(event) => updateRecipe("personality", event.target.value)}
              />
            </label>
            <button
              className="hero-mode-switch"
              type="button"
              disabled={busy}
              onClick={() => setRecipeMode("freeform")}
            >
              I want to describe everything myself
            </button>
            <div className="hero-description-summary" aria-live="polite">
              <strong>Your hero description</strong>
              <p>{project.hero.childDescription || "Your answers will appear here as you type."}</p>
            </div>
          </div>
        ) : (
          <div className="hero-freeform">
            <label htmlFor="hero-description">Describe everything yourself</label>
            <textarea
              id="hero-description"
              value={project.hero.childDescription}
              disabled={busy}
              onChange={(event) => updateDescription(event.target.value)}
              placeholder="Their clothes, hair, special gear, colors, personality, and anything that makes them unmistakable…"
              maxLength={HERO_DESCRIPTION_MAX_LENGTH}
            />
            <button
              className="hero-mode-switch"
              type="button"
              disabled={busy}
              onClick={() => setRecipeMode("guided")}
            >
              Use the hero recipe
            </button>
          </div>
        )}
        <button
          className="button button-primary draw-button"
          type="button"
          disabled={!canDraw}
          aria-describedby="hero-drawing-status"
          onClick={generate}
        >
          <PencilIcon />
          Draw my hero
        </button>
        <p className="drawing-status" id="hero-drawing-status">{drawingStatus}</p>
        <p className="artifact-progress"><span aria-hidden="true">✓</span> Hero ready · Next: choose your style</p>
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
      <figure className="hero-art-panel">
        <div className="hero-art-frame">
          <img src={featuredUrl} alt="" />
        </div>
        {(approved || candidate) ? (
          <figcaption className="hero-version-strip">
            {approved ? (
              <div className="hero-version current-hero">
                <img src={api.imageUrl(project.id, approved.id)} alt="" />
                <strong>Current hero</strong>
              </div>
            ) : null}
            {candidate ? (
              <div className="hero-version candidate-hero">
                <img src={api.imageUrl(project.id, candidate.id)} alt="" />
                <strong>Newest candidate</strong>
              </div>
            ) : null}
            {candidate ? (
              <div className="hero-version-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={!canMutateServer}
                  onClick={() => void reject(candidate.id)}
                >
                  {approved ? "Keep current" : "Dismiss candidate"}
                </button>
                <button
                  className="button button-approve"
                  type="button"
                  disabled={!canMutateServer}
                  onClick={() => void approve(candidate.id)}
                >
                  Use this version
                </button>
              </div>
            ) : null}
          </figcaption>
        ) : (
          <figcaption>
            <strong>Sample artwork</strong>
            <span>Your hero will become the visual guide for every panel.</span>
          </figcaption>
        )}
      </figure>
    </section>
  );
}

function newestCandidate(versions: readonly ImageVersion[]): ImageVersion | undefined {
  return versions.filter((version) => version.status === "candidate").at(-1);
}
