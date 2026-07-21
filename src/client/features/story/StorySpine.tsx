import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BEAT_TEXT_MAX_LENGTH,
  COLLABORATOR_NAME_MAX_LENGTH,
  MAX_PANELS,
  addPanelToBeat,
  type Project,
} from "../../../domain/project";
import {
  coachQuestionForSignal,
  type CoachSignal,
} from "../../../domain/story-coach";
import {
  ComicApiError,
  type ComicApi,
  type GenerationConfigStatus,
} from "../../api/client";
import type { SaveState } from "../../state/use-project";

const labels = {
  setup: "Setup",
  problem: "Problem",
  bigMoment: "Big Moment",
  ending: "Ending",
} as const;

const hints = {
  setup: "Who is the hero, and where are they?",
  problem: "What goes wrong?",
  bigMoment: "What is the most important action or choice?",
  ending: "How does it finish?",
} as const;

function BeatIcon({ type }: { type: keyof typeof labels }) {
  const paths = {
    setup: <><circle cx="12" cy="8" r="4" /><path d="M5 21c.7-5 3-7 7-7s6.3 2 7 7" /></>,
    problem: <><path d="M5 15a5 5 0 0 1 2-9 6 6 0 0 1 11 2 4 4 0 0 1 0 8H7" /><path d="m13 12-3 5h3l-2 5" /></>,
    bigMoment: <path d="m12 2 2.3 6 6.2-1.7-3.4 5.4 5 4-6.4.5.4 6.4-4.1-5-4.1 5 .4-6.4-6.4-.5 5-4-3.4-5.4L9.7 8 12 2Z" />,
    ending: <><path d="m12 3 6 6-6 6-6-6 6-6Z" /><path d="M9 17c0 3-2 4-5 4M15 17c0 3 2 4 5 4" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

export function StorySpine({
  project,
  onChange,
  api,
  configStatus = "disabled",
  saveState,
}: {
  project: Project;
  onChange: (project: Project) => void;
  api?: ComicApi;
  configStatus?: GenerationConfigStatus;
  saveState: SaveState;
}) {
  const [coachSignal, setCoachSignal] = useState<CoachSignal>();
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachHidden, setCoachHidden] = useState(false);
  const [coachError, setCoachError] = useState<string>();
  const coachRequestIdentity = useRef(0);
  const coachMounted = useRef(false);
  const currentCoachApi = useRef(api);
  const currentCoachProjectId = useRef(project.id);
  const storySnapshot = JSON.stringify(project.beats.map((beat) => beat.childText));
  const currentStorySnapshot = useRef(storySnapshot);
  const currentSaveState = useRef(saveState);
  const coachEnabled = Boolean(api) && configStatus === "enabled" && saveState === "saved";

  useEffect(() => {
    coachMounted.current = true;
    return () => {
      coachMounted.current = false;
      coachRequestIdentity.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    const storyChanged = currentStorySnapshot.current !== storySnapshot;
    const contextChanged = currentCoachApi.current !== api
      || currentCoachProjectId.current !== project.id
      || storyChanged
      || currentSaveState.current !== saveState;
    currentCoachApi.current = api;
    currentCoachProjectId.current = project.id;
    currentStorySnapshot.current = storySnapshot;
    currentSaveState.current = saveState;
    if (contextChanged) {
      coachRequestIdentity.current += 1;
      setCoachBusy(false);
      setCoachError(undefined);
      if (storyChanged) setCoachSignal(undefined);
    }
  }, [api, project.id, saveState, storySnapshot]);
  const collaboration = project.collaboration ?? {
    enabled: false,
    authors: [project.localAuthorCredit.slice(0, COLLABORATOR_NAME_MAX_LENGTH), ""] as [string, string],
    activeAuthorIndex: 0 as const,
  };
  const currentAuthor = collaboration.authors[collaboration.activeAuthorIndex].trim()
    || `Writer ${collaboration.activeAuthorIndex + 1}`;
  const otherAuthorIndex = collaboration.activeAuthorIndex === 0 ? 1 : 0;
  const otherAuthor = collaboration.authors[otherAuthorIndex].trim()
    || `Writer ${otherAuthorIndex + 1}`;
  const completedBeats = project.beats.filter((beat) => beat.childText.trim()).length;

  const updateAuthor = (index: 0 | 1, name: string) => {
    const authors: [string, string] = [...collaboration.authors];
    authors[index] = name;
    const localAuthorCredit = authors.map((author) => author.trim()).filter(Boolean).join(" & ");
    onChange({
      ...project,
      localAuthorCredit,
      collaboration: { ...collaboration, authors },
    });
  };

  const askCoach = async (previousSignal?: CoachSignal) => {
    if (!api || !coachEnabled || coachBusy) return;
    const requestIdentity = coachRequestIdentity.current + 1;
    coachRequestIdentity.current = requestIdentity;
    const requestApi = api;
    const requestProjectId = project.id;
    const requestStorySnapshot = storySnapshot;
    const isCurrent = () => coachMounted.current
      && coachRequestIdentity.current === requestIdentity
      && currentCoachApi.current === requestApi
      && currentCoachProjectId.current === requestProjectId
      && currentStorySnapshot.current === requestStorySnapshot
      && currentSaveState.current === "saved";
    setCoachBusy(true);
    setCoachHidden(false);
    setCoachError(undefined);
    try {
      const result = await requestApi.coachStory(requestProjectId, {
        ...(previousSignal ? { previousSignal } : {}),
      });
      if (isCurrent()) setCoachSignal(result.signal);
    } catch (error) {
      if (isCurrent()) setCoachError(error instanceof ComicApiError
        ? error.payload.message
        : "The coach could not finish that check. Your story is still safe.");
    } finally {
      if (isCurrent()) setCoachBusy(false);
    }
  };

  return (
    <section className="screen-section story-screen" aria-labelledby="story-title">
      <header className="screen-heading">
        <h1 id="story-title" tabIndex={-1}>Build your story</h1>
        <p>You write the four moments. Your illustrator follows your lead.</p>
      </header>
      <section className="pass-the-pen" aria-labelledby="pass-the-pen-title">
        <div>
          <p className="step-kicker">Optional</p>
          <h2 id="pass-the-pen-title">Pass the pen</h2>
          <p>Two writers can take turns on this device. No account or sharing needed.</p>
        </div>
        {!collaboration.enabled ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onChange({
              ...project,
              collaboration: { ...collaboration, enabled: true },
            })}
          >
            Write with a friend
          </button>
        ) : (
          <div className="pass-the-pen-controls">
            <div className="writer-name-fields">
              <label>
                Writer 1
                <input
                  value={collaboration.authors[0]}
                  maxLength={COLLABORATOR_NAME_MAX_LENGTH}
                  onChange={(event) => updateAuthor(0, event.target.value)}
                />
              </label>
              <label>
                Writer 2
                <input
                  value={collaboration.authors[1]}
                  maxLength={COLLABORATOR_NAME_MAX_LENGTH}
                  onChange={(event) => updateAuthor(1, event.target.value)}
                />
              </label>
            </div>
            <div className="pen-handoff" aria-live="polite">
              <strong>{currentAuthor} is writing</strong>
              <button
                type="button"
                className="button button-primary button-small"
                aria-label={`Pass the pen to ${otherAuthor}`}
                onClick={() => onChange({
                  ...project,
                  collaboration: {
                    ...collaboration,
                    activeAuthorIndex: otherAuthorIndex,
                  },
                })}
              >
                Pass to {otherAuthor}
              </button>
              <button
                type="button"
                className="button-link"
                onClick={() => onChange({
                  ...project,
                  collaboration: { ...collaboration, enabled: false },
                })}
              >
                Write solo
              </button>
            </div>
          </div>
        )}
      </section>
      <div className="story-line" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="beat-grid">
        {project.beats.map((beat) => {
          const label = labels[beat.type];
          const count = beat.panelIds.length;
          const atLimit = project.panels.length >= MAX_PANELS;
          const fieldId = `story-beat-${beat.id}`;
          return (
          <article key={beat.id} className={`beat-card beat-${beat.type}`}>
            <span className="beat-header">
              <span className="beat-icon"><BeatIcon type={beat.type} /></span>
              <span>
                <strong>{label}</strong>
                <span>{hints[beat.type]}</span>
              </span>
            </span>
            <label className="sr-only" htmlFor={fieldId}>{label}</label>
            <textarea
              id={fieldId}
              value={beat.childText}
              onChange={(event) => onChange({
                ...project,
                beats: project.beats.map((item) => item.id === beat.id
                  ? { ...item, childText: event.target.value }
                  : item),
              })}
              maxLength={BEAT_TEXT_MAX_LENGTH}
            />
            <div className="beat-panel-actions">
              <span>{count} {count === 1 ? "panel" : "panels"}</span>
              <button
                type="button"
                aria-label={`Add another panel to ${label}`}
                disabled={atLimit}
                onClick={() => onChange(addPanelToBeat(project, beat.id))}
              >
                Add another panel
              </button>
            </div>
            {atLimit ? (
              <span className="beat-panel-limit">
                Comic limit reached: {MAX_PANELS} panels.
              </span>
            ) : null}
          </article>
          );
        })}
      </div>
      <section className="story-coach" aria-labelledby="story-coach-title">
        <div className="story-coach-intro">
          <h2 id="story-coach-title">Story Coach</h2>
          <p>Your coach asks questions. You write every word.</p>
        </div>
        <button
          className="button button-secondary story-coach-ask"
          type="button"
          disabled={!coachEnabled || coachBusy}
          onClick={() => void askCoach()}
        >
          {coachBusy ? "Thinking of one question…" : "Ask for one question"}
        </button>
        {configStatus === "disabled" ? (
          <p className="story-coach-mode">Add an API key to ask the AI coach.</p>
        ) : null}
        {configStatus === "enabled" && saveState !== "saved" ? (
          <p className="story-coach-mode">Wait for your story to finish saving before asking.</p>
        ) : null}
        {coachError ? <p className="story-coach-error" role="alert">{coachError}</p> : null}
        {coachSignal && !coachHidden ? (
          <div className="story-coach-answer" role="status" aria-live="polite">
            <p>{coachQuestionForSignal(coachSignal)}</p>
            <div className="story-coach-actions">
              <button type="button" onClick={() => setCoachSignal(undefined)}>I've got it</button>
              <button
                type="button"
                disabled={!coachEnabled || coachBusy}
                onClick={() => void askCoach(coachSignal)}
              >
                Ask another
              </button>
              <button type="button" onClick={() => setCoachHidden(true)}>Hide help</button>
            </div>
          </div>
        ) : null}
      </section>
      <p className="artifact-progress">
        <span aria-hidden="true">✓</span> Story plan ready · {completedBeats} of 4 moments written
      </p>
    </section>
  );
}
