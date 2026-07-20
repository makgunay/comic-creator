import { describe, expect, it } from "vitest";
import { evaluateSmokeGate } from "../../src/server/generation/smoke-gate";

describe("evaluateSmokeGate", () => {
  it("returns a machine-readable passing summary at the latency boundaries", () => {
    expect(
      evaluateSmokeGate({ heroDurationMs: 60_000, panelDurationMs: 30_000 }),
    ).toEqual({
      event: "openai_smoke_summary",
      gatePassed: true,
      limits: { heroDurationMs: 60_000, panelDurationMs: 30_000 },
      measurements: { heroDurationMs: 60_000, panelDurationMs: 30_000 },
      failures: [],
    });
  });

  it("preserves every failed latency measurement in the summary", () => {
    expect(
      evaluateSmokeGate({ heroDurationMs: 60_001, panelDurationMs: 30_001 }),
    ).toEqual({
      event: "openai_smoke_summary",
      gatePassed: false,
      limits: { heroDurationMs: 60_000, panelDurationMs: 30_000 },
      measurements: { heroDurationMs: 60_001, panelDurationMs: 30_001 },
      failures: ["hero_latency", "panel_latency"],
    });
  });
});
