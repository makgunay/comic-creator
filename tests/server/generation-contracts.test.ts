import { describe, expect, it } from "vitest";
import {
  CoachClassificationSchema,
  RenderingChoicesSchema,
  StoryCoachInputSchema,
} from "../../src/server/generation/contracts";

describe("RenderingChoicesSchema", () => {
  it("accepts only the five enumerated rendering choices", () => {
    expect(
      RenderingChoicesSchema.parse({
        shotSize: "medium",
        cameraAngle: "low",
        lighting: "dramatic",
        palette: "bright",
        focus: "hero",
      }),
    ).toEqual({
      shotSize: "medium",
      cameraAngle: "low",
      lighting: "dramatic",
      palette: "bright",
      focus: "hero",
    });
  });

  it("rejects free-text story content and non-enumerated values", () => {
    expect(() =>
      RenderingChoicesSchema.parse({
        shotSize: "cinematic",
        cameraAngle: "low",
        lighting: "dramatic",
        palette: "bright",
        focus: "hero",
        plotAddition: "A dragon arrives.",
      }),
    ).toThrow();

    expect(() =>
      RenderingChoicesSchema.parse({
        shotSize: "medium",
        cameraAngle: "low",
        lighting: "dramatic",
        palette: "bright",
        focus: "hero",
        plotAddition: "A dragon arrives.",
      }),
    ).toThrow();
  });
});

describe("CoachClassificationSchema", () => {
  it("accepts only one enumerated story signal", () => {
    expect(CoachClassificationSchema.parse({
      signal: "big_moment_needs_choice",
    })).toEqual({ signal: "big_moment_needs_choice" });
  });

  it("rejects model-authored questions and story suggestions", () => {
    expect(() => CoachClassificationSchema.parse({
      signal: "big_moment_needs_choice",
      question: "Should a dragon arrive?",
      plotSuggestion: "A dragon arrives.",
    })).toThrow();
  });
});

describe("StoryCoachInputSchema", () => {
  it("accepts only the four child-authored beats and an optional previous signal", () => {
    expect(StoryCoachInputSchema.parse({
      setup: "Mira walks in the forest.",
      problem: "Her dog runs away.",
      bigMoment: "Mira chooses to follow the paw prints.",
      ending: "They find each other and go home.",
      previousSignal: "setup_needs_setting",
    })).toMatchObject({ previousSignal: "setup_needs_setting" });
  });

  it("rejects titles, bylines, panels, and model-facing prose", () => {
    expect(() => StoryCoachInputSchema.parse({
      setup: "A beginning",
      problem: "A problem",
      bigMoment: "A choice",
      ending: "An ending",
      title: "Private title",
      byline: "Child name",
      panelPrompt: "Draw a dragon",
    })).toThrow();
  });
});
