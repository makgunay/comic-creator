import { useEffect, useRef, useState } from "react";
import type { Project } from "../domain/project";
import {
  comicApi,
  type ComicApi,
  type GenerationConfigStatus,
} from "./api/client";
import { AppFrame, type WorkshopStep } from "./components/AppFrame";
import { ComicPreview } from "./features/comic/ComicPreview";
import { HeroWorkshop } from "./features/hero/HeroWorkshop";
import { LaunchScreen } from "./features/launch/LaunchScreen";
import { PanelWorkshop } from "./features/panels/PanelWorkshop";
import { StorySpine } from "./features/story/StorySpine";
import { StylePicker } from "./features/style/StylePicker";
import { useProject } from "./state/use-project";

const safeProjectId = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,127}$/;

function projectIdFromLocation(): string | undefined {
  const value = new URL(window.location.href).searchParams.get("project");
  return value && safeProjectId.test(value) ? value : undefined;
}

function rememberProjectId(projectId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("project", projectId);
  window.history.replaceState(window.history.state, "", url);
}

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
  configStatus,
}: {
  projectId: string;
  api: ComicApi;
  configStatus: GenerationConfigStatus;
}) {
  const { project, saveState, update, acceptServerProject } = useProject(projectId, api);
  const [step, setStep] = useState<WorkshopStep>("hero");
  const [activeDraw, setActiveDraw] = useState(false);

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
      configStatus={configStatus}
      interactionLocked={activeDraw}
      onStepChange={setStep}
    >
      {step === "hero" ? (
        <HeroWorkshop
          project={project}
          configStatus={configStatus}
          saveState={saveState}
          api={api}
          onChange={replaceProject}
          acceptServerProject={acceptServerProject}
          onBusyChange={setActiveDraw}
        />
      ) : null}
      {step === "style" ? (
        <StylePicker
          value={project.visualStyle}
          onChange={(visualStyle) => update((current) => ({ ...current, visualStyle }))}
        />
      ) : null}
      {step === "story" ? <StorySpine project={project} onChange={replaceProject} /> : null}
      {step === "panels" ? (
        <PanelWorkshop
          project={project}
          api={api}
          saveState={saveState}
          configStatus={configStatus}
          onChange={replaceProject}
          acceptServerProject={acceptServerProject}
          onBackToStory={() => setStep("story")}
          onNextToPremiere={() => setStep("premiere")}
          onBusyChange={setActiveDraw}
        />
      ) : null}
      {step === "premiere" ? (
        <ComicPreview
          project={project}
          api={api}
          imageUrl={(_panelId, imageId) => api.imageUrl(project.id, imageId)}
          exportUrl={api.exportUrl(project.id)}
          onBackToPanels={() => setStep("panels")}
        />
      ) : null}
      {step !== "panels" && step !== "premiere" ? <div className="step-actions">
        {step !== "hero" ? (
          <button
            className="button button-secondary previous-button"
            type="button"
            disabled={activeDraw}
            onClick={() => setStep(step === "story" ? "style" : "hero")}
          >
            <ArrowIcon direction="left" />
            Previous: {step === "story" ? "Style" : "Hero"}
          </button>
        ) : <span />}
        {step === "hero" ? (
          <button
            className="button button-next button-next-blue"
            type="button"
            disabled={activeDraw}
            onClick={() => setStep("style")}
          >
            Next: Choose a style
            <ArrowIcon />
          </button>
        ) : null}
        {step === "style" ? (
          <button className="button button-next" type="button" disabled={activeDraw} onClick={() => setStep("story")}>
            Next: Build your story
            <ArrowIcon />
          </button>
        ) : null}
        {step === "story" ? (
          <button className="button button-next" type="button" disabled={activeDraw} onClick={() => setStep("panels")}>
            Next: Direct panels
            <ArrowIcon />
          </button>
        ) : null}
      </div> : null}
    </AppFrame>
  );
}

export function App({ api = comicApi }: { api?: ComicApi }) {
  const [configStatus, setConfigStatus] = useState<GenerationConfigStatus>("loading");
  const configRequest = useRef(0);
  const [projectId, setProjectId] = useState<string | undefined>(
    projectIdFromLocation,
  );

  useEffect(() => {
    const requestId = configRequest.current + 1;
    configRequest.current = requestId;
    let active = true;
    const controller = new AbortController();
    setConfigStatus("loading");
    void api.config({ signal: controller.signal })
      .then((config) => {
        if (active && configRequest.current === requestId) {
          setConfigStatus(config.generationEnabled ? "enabled" : "disabled");
        }
      })
      .catch((error: unknown) => {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (!aborted && active && configRequest.current === requestId) {
          setConfigStatus("error");
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api]);

  if (projectId) {
    return (
      <ProjectWorkshop
        projectId={projectId}
        api={api}
        configStatus={configStatus}
      />
    );
  }

  return (
    <LaunchScreen
      api={api}
      configStatus={configStatus}
      onOpenProject={(project) => {
        rememberProjectId(project.id);
        setProjectId(project.id);
      }}
    />
  );
}
