import { useEffect, useRef, type ReactNode } from "react";
import type { GenerationConfigStatus } from "../api/client";
import type { SaveState } from "../state/use-project";
import { StatusNotice } from "./StatusNotice";

export type WorkshopStep = "hero" | "style" | "story" | "panels" | "premiere";

const steps: { id: WorkshopStep; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "style", label: "Style" },
  { id: "story", label: "Story" },
  { id: "panels", label: "Panels" },
  { id: "premiere", label: "Premiere" },
];

const saveLabels: Record<SaveState, string> = {
  loading: "Loading",
  dirty: "Not saved yet",
  saving: "Saving",
  saved: "Saved",
  error: "Save needs a retry",
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

export function AppFrame({
  title,
  currentStep,
  saveState,
  configStatus,
  interactionLocked = false,
  onStepChange,
  children,
}: {
  title: string;
  currentStep: WorkshopStep;
  saveState: SaveState;
  configStatus: GenerationConfigStatus;
  interactionLocked?: boolean;
  onStepChange: (step: WorkshopStep) => void;
  children: ReactNode;
}) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [currentStep]);

  return (
    <div className="app-frame">
      <header className="workshop-header">
        <div className="brand-lockup">
          <span className="brand-name">Comic Creator</span>
          <span className="project-title">{title}</span>
        </div>
        <nav className="step-nav" aria-label="Comic workshop steps">
          {steps.map((step, index) => {
            const available = index <= 4;
            return (
              <button
                className="step-button"
                type="button"
                key={step.id}
                aria-label={step.label}
                aria-current={step.id === currentStep ? "step" : undefined}
                aria-disabled={!available || interactionLocked}
                disabled={!available || interactionLocked}
                onClick={() => onStepChange(step.id)}
              >
                <span className="step-number">{index + 1}</span>
                <span>{step.label}</span>
                {index < steps.length - 1 ? (
                  <span
                    className={index < currentIndex ? "step-line complete" : "step-line"}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className={`save-indicator save-${saveState}`} role="status" aria-live="polite">
          {saveState === "saved" ? <CheckIcon /> : <span className="save-dot" aria-hidden="true" />}
          <span>{saveLabels[saveState]}</span>
        </div>
      </header>
      {configStatus === "disabled" ? (
        <StatusNotice title="Sample mode">
          Drawing is off, but your writing and local edits still save on this device.
        </StatusNotice>
      ) : null}
      {configStatus === "loading" ? (
        <StatusNotice title="Checking the art studio">
          Your writing still saves while drawing availability is checked.
        </StatusNotice>
      ) : null}
      {configStatus === "error" ? (
        <StatusNotice title="Drawing unavailable" tone="error">
          Configuration could not be checked. Your writing and local edits still save.
        </StatusNotice>
      ) : null}
      <main className="workshop-main" ref={mainRef}>{children}</main>
    </div>
  );
}
