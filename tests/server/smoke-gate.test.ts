import { describe, expect, it } from "vitest";
import { evaluateSmokeGate } from "../../src/server/generation/smoke-gate";

describe("evaluateSmokeGate", () => {
  it("returns a machine-readable passing summary at the latency boundaries", () => {
    expect(
      evaluateSmokeGate({ heroDurationMs: 60_000, panelDurationMs: 35_000 }),
    ).toEqual({
      event: "openai_smoke_summary",
      gatePassed: true,
      limits: { heroDurationMs: 60_000, panelDurationMs: 35_000 },
      measurements: { heroDurationMs: 60_000, panelDurationMs: 35_000 },
      failures: [],
    });
  });

  it("fails at one millisecond beyond the revised panel boundary", () => {
    expect(
      evaluateSmokeGate({ heroDurationMs: 60_000, panelDurationMs: 35_001 }),
    ).toEqual({
      event: "openai_smoke_summary",
      gatePassed: false,
      limits: { heroDurationMs: 60_000, panelDurationMs: 35_000 },
      measurements: { heroDurationMs: 60_000, panelDurationMs: 35_001 },
      failures: ["panel_latency"],
    });
  });
});
