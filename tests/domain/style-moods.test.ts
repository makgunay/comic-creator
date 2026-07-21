import { describe, expect, it } from "vitest";
import { compileStyleMoods } from "../../src/domain/style-moods";

describe("compileStyleMoods", () => {
  it("adds only the selected child-facing moods to the preset", () => {
    expect(compileStyleMoods("Bold cartoon art.", ["funny", "colorful"]))
      .toBe("Bold cartoon art. Playful comic energy. Bright, lively color emphasis.");
  });

  it("leaves the preset unchanged when no mood is selected", () => {
    expect(compileStyleMoods("Crisp manga ink.", [])).toBe("Crisp manga ink.");
  });
});
