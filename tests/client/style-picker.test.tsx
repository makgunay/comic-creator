import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StylePicker } from "../../src/client/features/style/StylePicker";

describe("StylePicker", () => {
  it("seeds both note fields from the selected preset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StylePicker
        value={{ presetId: "cartoon", baselineNotes: "Cartoon base.", editedNotes: "My edit.", moods: [] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Manga" }));

    expect(onChange).toHaveBeenCalledWith({
      presetId: "manga",
      baselineNotes: "Crisp manga ink, dynamic motion, expressive eyes, selective color.",
      editedNotes: "Crisp manga ink, dynamic motion, expressive eyes, selective color.",
      moods: [],
    });
  });

  it("lets a child select up to two moods and compiles plain-language style notes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = render(
      <StylePicker
        value={{ presetId: "cartoon", baselineNotes: "Bold cartoon art.", editedNotes: "Bold cartoon art.", moods: [] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Funny" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      moods: ["funny"],
      editedNotes: "Bold cartoon art. Playful comic energy.",
    }));

    view.rerender(
      <StylePicker
        value={{
          presetId: "cartoon",
          baselineNotes: "Bold cartoon art.",
          editedNotes: "Bold cartoon art. Playful comic energy.",
          moods: ["funny", "colorful"],
        }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Dramatic" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Funny" })).toHaveAttribute("aria-pressed", "true");
  });

  it("edits only the child-facing notes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StylePicker
        value={{ presetId: "manga", baselineNotes: "Crisp manga ink.", editedNotes: "Soft pencil.", moods: [] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fine-tune the words" }));
    fireEvent.change(screen.getByLabelText("Fine-tune your style words"), {
      target: { value: "Soft pencil. More glow." },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      presetId: "manga",
      baselineNotes: "Crisp manga ink.",
      editedNotes: "Soft pencil. More glow.",
      moods: [],
    });
    expect(screen.queryByText(/system rules/i)).not.toBeInTheDocument();
  });

  it("restores the preset baseline without exposing or changing system rules", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StylePicker
        value={{ presetId: "manga", baselineNotes: "Crisp manga ink.", editedNotes: "Soft pencil.", moods: ["dreamy"] }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Fine-tune the words" }));
    await user.click(screen.getByRole("button", { name: "Use my choices" }));
    expect(onChange).toHaveBeenCalledWith({
      presetId: "manga",
      baselineNotes: "Crisp manga ink.",
      editedNotes: "Crisp manga ink. Soft, imaginative atmosphere.",
      moods: ["dreamy"],
    });
  });
});
