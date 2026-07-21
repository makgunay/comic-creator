import { z } from "zod";

export const CoachSignalSchema = z.enum([
  "setup_needs_hero",
  "setup_needs_setting",
  "problem_needs_change",
  "big_moment_needs_choice",
  "ending_needs_resolution",
  "beats_need_connection",
  "ready",
]);

export type CoachSignal = z.infer<typeof CoachSignalSchema>;

const questions: Record<CoachSignal, string> = {
  setup_needs_hero: "Who is the hero when the story begins?",
  setup_needs_setting: "Where is your hero when the story begins?",
  problem_needs_change: "What changes and gives your hero a problem to solve?",
  big_moment_needs_choice: "What choice does your hero make in the big moment?",
  ending_needs_resolution: "How does the ending show what changed?",
  beats_need_connection: "What connects one story moment to the next?",
  ready: "Your story spine is ready. What part are you most excited to draw?",
};

export function coachQuestionForSignal(signal: CoachSignal): string {
  return questions[signal];
}
