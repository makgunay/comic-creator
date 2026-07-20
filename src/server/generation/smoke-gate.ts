const HERO_LIMIT_MS = 60_000;
const PANEL_LIMIT_MS = 30_000;

interface SmokeMeasurements {
  heroDurationMs: number;
  panelDurationMs: number;
}

export interface SmokeGateSummary {
  event: "openai_smoke_summary";
  gatePassed: boolean;
  limits: SmokeMeasurements;
  measurements: SmokeMeasurements;
  failures: Array<"hero_latency" | "panel_latency">;
}

export function evaluateSmokeGate(
  measurements: SmokeMeasurements,
): SmokeGateSummary {
  const failures: SmokeGateSummary["failures"] = [];
  if (measurements.heroDurationMs > HERO_LIMIT_MS) {
    failures.push("hero_latency");
  }
  if (measurements.panelDurationMs > PANEL_LIMIT_MS) {
    failures.push("panel_latency");
  }
  return {
    event: "openai_smoke_summary",
    gatePassed: failures.length === 0,
    limits: {
      heroDurationMs: HERO_LIMIT_MS,
      panelDurationMs: PANEL_LIMIT_MS,
    },
    measurements,
    failures,
  };
}
