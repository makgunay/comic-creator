import { describe, expect, it } from "vitest";
import { RenderingChoicesSchema } from "../../src/server/generation/contracts";

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
