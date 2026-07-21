import { describe, expect, it } from "vitest";
import { coachQuestionForSignal } from "../../src/domain/story-coach";

describe("coachQuestionForSignal", () => {
  it("maps model signals to fixed neutral questions", () => {
    expect(coachQuestionForSignal("setup_needs_setting"))
      .toBe("Where is your hero when the story begins?");
    expect(coachQuestionForSignal("big_moment_needs_choice"))
      .toBe("What choice does your hero make in the big moment?");
  });

  it("celebrates a complete spine without adding story content", () => {
    expect(coachQuestionForSignal("ready"))
      .toBe("Your story spine is ready. What part are you most excited to draw?");
  });
});
