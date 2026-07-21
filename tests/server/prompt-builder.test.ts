import { describe, expect, it } from "vitest";
import { buildImagePrompt } from "../../src/server/generation/prompt-builder";

const visualInput = {
  heroDescription: "Nova wears a violet flight jacket and round goggles.",
  action: "Nova pulls the moon kite away from the storm cloud.",
  setting: "A rooftop at night.",
  mood: "brave",
  framing: "show the whole kite",
  styleNotes: "Bold ink and textured color.",
  revisionDirection: "Make the storm cloud smaller.",
};

const renderingChoices = {
  shotSize: "wide" as const,
  cameraAngle: "eye_level" as const,
  lighting: "moonlit" as const,
  palette: "cool" as const,
  focus: "action" as const,
};

describe("buildImagePrompt", () => {
  it("includes every child-authored visual fact exactly once", () => {
    const prompt = buildImagePrompt(visualInput, renderingChoices);

    for (const fact of Object.values(visualInput)) {
      expect(prompt.split(fact)).toHaveLength(2);
    }
  });

  it("adds only the enumerated rendering choices", () => {
    const prompt = buildImagePrompt(visualInput, renderingChoices);

    expect(prompt).toContain(
      "wide shot, eye_level angle, moonlit lighting, cool palette, focus on action.",
    );
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("[object Object]");
  });

  it("does not send dialogue, caption, or local author-credit language", () => {
    const prompt = buildImagePrompt(visualInput, renderingChoices).toLowerCase();

    expect(prompt).not.toContain("dialogue");
    expect(prompt).not.toContain("caption");
    expect(prompt).not.toContain("author");
    expect(prompt).not.toContain("credit");
  });

  it("omits an empty revision direction without inventing replacement facts", () => {
    const prompt = buildImagePrompt(
      { ...visualInput, revisionDirection: "" },
      renderingChoices,
    );

    expect(prompt).not.toContain("Child-requested visual change:");
    expect(prompt).not.toContain("undefined");
  });

  it("adds exact quoted child lettering and placement only when explicitly provided", () => {
    const prompt = buildImagePrompt(visualInput, renderingChoices, [
      { id: "d", kind: "dialogue", text: "Wait — don't go!", x: .05, y: .1, width: .45, height: .2 },
      { id: "c", kind: "caption", text: "Later that night…", x: .1, y: .75, width: .8, height: .15 },
    ]);

    expect(prompt).not.toContain("no written words");
    expect(prompt).toContain(JSON.stringify("Wait — don't go!"));
    expect(prompt).toContain(JSON.stringify("Later that night…"));
    expect(prompt).toContain("exactly once");
    expect(prompt).toContain("5% from the left");
    expect(prompt).toContain("10% from the top");
    expect(prompt).toContain("75% from the top");
    expect(prompt).toContain("20% of the image height");
    expect(prompt).toContain("15% of the image height");
    expect(prompt).not.toContain("landscape-safe");
    expect(prompt).not.toContain("between 20% and 80%");
    expect(prompt).toContain("Do not add any other text");
  });
});
