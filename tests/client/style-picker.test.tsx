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
        value={{ presetId: "cartoon", baselineNotes: "Cartoon base.", editedNotes: "My edit." }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Manga" }));

    expect(onChange).toHaveBeenCalledWith({
      presetId: "manga",
      baselineNotes: "Crisp manga ink, dynamic motion, expressive eyes, selective color.",
      editedNotes: "Crisp manga ink, dynamic motion, expressive eyes, selective color.",
    });
  });

  it("edits only the child-facing notes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StylePicker
        value={{ presetId: "manga", baselineNotes: "Crisp manga ink.", editedNotes: "Soft pencil." }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Style notes"), {
      target: { value: "Soft pencil. More glow." },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      presetId: "manga",
      baselineNotes: "Crisp manga ink.",
      editedNotes: "Soft pencil. More glow.",
    });
    expect(screen.queryByText(/system rules/i)).not.toBeInTheDocument();
  });

  it("restores the preset baseline without exposing or changing system rules", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StylePicker
        value={{ presetId: "manga", baselineNotes: "Crisp manga ink.", editedNotes: "Soft pencil." }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reset style notes" }));
    expect(onChange).toHaveBeenCalledWith({
      presetId: "manga",
      baselineNotes: "Crisp manga ink.",
      editedNotes: "Crisp manga ink.",
    });
  });
});
