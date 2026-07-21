import { describe, expect, it } from "vitest";
import { compileHeroRecipe } from "../../src/domain/hero-recipe";

describe("compileHeroRecipe", () => {
  it("assembles only the child's non-empty visual facts", () => {
    expect(compileHeroRecipe({
      mode: "guided",
      appearance: "long dark hair and brown eyes",
      outfit: "a pink shirt and blue jeans",
      special: "a silver compass",
      personality: "curious and brave",
    })).toBe(
      "Appearance: long dark hair and brown eyes. Outfit: a pink shirt and blue jeans. Special detail: a silver compass. Personality: curious and brave.",
    );
  });

  it("does not add missing characteristics", () => {
    expect(compileHeroRecipe({
      mode: "guided",
      appearance: "  curly hair  ",
      outfit: "",
      special: "",
      personality: "",
    })).toBe("Appearance: curly hair.");
  });
});
