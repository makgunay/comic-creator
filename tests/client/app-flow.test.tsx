import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/client/App";
import type { ComicApi } from "../../src/client/api/client";
import { makeProject } from "../fixtures/project-fixtures";

function makeApi(): ComicApi {
  const project = makeProject();
  return {
    config: vi.fn().mockResolvedValue({ generationEnabled: false }),
    createProject: vi.fn().mockResolvedValue(project),
    copySample: vi.fn().mockResolvedValue(project),
    loadProject: vi.fn().mockResolvedValue(project),
    saveProject: vi.fn().mockImplementation(async (next) => next),
  };
}

describe("App child flow", () => {
  it("navigates from a new project through hero, style, and story", async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);

    await user.type(screen.getByLabelText("Comic title"), "Moon Kite Club");
    await user.click(screen.getByRole("button", { name: "Start a new comic" }));
    expect(await screen.findByRole("heading", { name: "Create your hero" })).toBeInTheDocument();
    expect(screen.getByText("Sample mode")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Style" }));
    expect(screen.getByRole("heading", { name: "Choose your comic’s look" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Story" }));
    expect(screen.getByRole("heading", { name: "Build your story" })).toBeInTheDocument();
  });

  it("opens the sample into the same editable workshop", async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);

    await user.click(screen.getByRole("button", { name: "Explore the sample" }));

    expect(await screen.findByRole("heading", { name: "Create your hero" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Story" })).toBeEnabled();
  });
});
