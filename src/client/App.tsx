import { useEffect, useState } from "react";
import type { Project } from "../domain/project";
import { comicApi, type ComicApi } from "./api/client";
import { AppFrame, type WorkshopStep } from "./components/AppFrame";
import { StatusNotice } from "./components/StatusNotice";
import { HeroWorkshop } from "./features/hero/HeroWorkshop";
import { LaunchScreen } from "./features/launch/LaunchScreen";
import { StorySpine } from "./features/story/StorySpine";
import { StylePicker } from "./features/style/StylePicker";
import { useProject } from "./state/use-project";

function ArrowIcon({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg className={direction === "left" ? "arrow-left" : undefined} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 6l6 6-6 6" />
    </svg>
  );
}

function ProjectWorkshop({
  projectId,
  api,
  generationEnabled,
}: {
  projectId: string;
  api: ComicApi;
  generationEnabled: boolean;
}) {
  const { project, saveState, update } = useProject(projectId, api);
  const [step, setStep] = useState<WorkshopStep>("hero");

  if (!project) {
    return (
      <main className="loading-shell">
        <span className="brand-name">Comic Creator</span>
        <p>{saveState === "error" ? "This project could not be opened." : "Opening your comic…"}</p>
      </main>
    );
  }

  const replaceProject = (next: Project) => update(() => next);
  return (
    <AppFrame
      title={project.title}
      currentStep={step}
      saveState={saveState}
      generationEnabled={generationEnabled}
      onStepChange={setStep}
    >
      {step === "hero" ? (
        <HeroWorkshop
          project={project}
          generationEnabled={generationEnabled}
          onChange={replaceProject}
        />
      ) : null}
      {step === "style" ? (
        <StylePicker
          value={project.visualStyle}
          onChange={(visualStyle) => update((current) => ({ ...current, visualStyle }))}
        />
      ) : null}
      {step === "story" ? <StorySpine project={project} onChange={replaceProject} /> : null}
      <div className="step-actions">
        {step !== "hero" ? (
          <button
            className="button button-secondary previous-button"
            type="button"
            onClick={() => setStep(step === "story" ? "style" : "hero")}
          >
            <ArrowIcon direction="left" />
            Previous: {step === "story" ? "Style" : "Hero"}
          </button>
        ) : <span />}
        {step === "hero" ? (
          <button className="button button-next" type="button" onClick={() => setStep("style")}>
            Next: Choose a style
            <ArrowIcon />
          </button>
        ) : null}
        {step === "style" ? (
          <button className="button button-next" type="button" onClick={() => setStep("story")}>
            Next: Build your story
            <ArrowIcon />
          </button>
        ) : null}
        {step === "story" ? (
          <button className="button button-next" type="button" disabled>
            Next: Direct panels
            <ArrowIcon />
          </button>
        ) : null}
      </div>
    </AppFrame>
  );
}

export function App({ api = comicApi }: { api?: ComicApi }) {
  const [generationEnabled, setGenerationEnabled] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [projectId, setProjectId] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    void api.config({ signal: controller.signal })
      .then((config) => setGenerationEnabled(config.generationEnabled))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setConfigError(true);
          setGenerationEnabled(false);
        }
      });
    return () => controller.abort();
  }, [api]);

  if (projectId) {
    return (
      <ProjectWorkshop
        projectId={projectId}
        api={api}
        generationEnabled={generationEnabled}
      />
    );
  }

  return (
    <>
      {configError ? (
        <div className="global-notice">
          <StatusNotice title="Local mode">
            Configuration could not be checked, so drawing stays off for now.
          </StatusNotice>
        </div>
      ) : null}
      <LaunchScreen
        api={api}
        generationEnabled={generationEnabled}
        onOpenProject={(project) => setProjectId(project.id)}
      />
    </>
  );
}
