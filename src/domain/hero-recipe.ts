import { z } from "zod";

export const HERO_RECIPE_FIELD_MAX_LENGTH = 270;

export const HeroRecipeSchema = z.strictObject({
  mode: z.enum(["guided", "freeform"]),
  appearance: z.string().max(HERO_RECIPE_FIELD_MAX_LENGTH),
  outfit: z.string().max(HERO_RECIPE_FIELD_MAX_LENGTH),
  special: z.string().max(HERO_RECIPE_FIELD_MAX_LENGTH),
  personality: z.string().max(HERO_RECIPE_FIELD_MAX_LENGTH),
});

export type HeroRecipe = z.infer<typeof HeroRecipeSchema>;

export function compileHeroRecipe(recipe: HeroRecipe): string {
  const facts = [
    ["Appearance", recipe.appearance],
    ["Outfit", recipe.outfit],
    ["Special detail", recipe.special],
    ["Personality", recipe.personality],
  ] as const;
  return facts
    .map(([label, value]) => [label, value.trim()] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value.replace(/[.!?]+$/, "")}.`)
    .join(" ");
}
