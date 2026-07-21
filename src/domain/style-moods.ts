import { z } from "zod";

export const StyleMoodSchema = z.enum([
  "funny",
  "dramatic",
  "dreamy",
  "mysterious",
  "colorful",
]);

export type StyleMood = z.infer<typeof StyleMoodSchema>;

const moodNotes: Record<StyleMood, string> = {
  funny: "Playful comic energy.",
  dramatic: "Dramatic light and strong emotion.",
  dreamy: "Soft, imaginative atmosphere.",
  mysterious: "Mysterious shadows and suspenseful atmosphere.",
  colorful: "Bright, lively color emphasis.",
};

export function compileStyleMoods(
  baselineNotes: string,
  moods: readonly StyleMood[],
): string {
  return [baselineNotes.trim(), ...moods.map((mood) => moodNotes[mood])]
    .filter(Boolean)
    .join(" ");
}
