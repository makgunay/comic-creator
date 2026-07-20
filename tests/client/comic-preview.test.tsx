import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ComicPreview } from "../../src/client/features/comic/ComicPreview";
import {
  makeEightPanelProject,
  makeImageVersion,
  makeProjectWithDialogue,
} from "../fixtures/project-fixtures";

describe("ComicPreview", () => {
  it("renders panels five through eight on a second numbered page", () => {
    const project = makeEightPanelProject();

    render(
      <ComicPreview
        project={project}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    const pages = screen.getAllByRole("article", { name: /Comic page/ });
    expect(pages).toHaveLength(2);
    expect(within(pages[0]!).getByText("Page 1 of 2")).toBeInTheDocument();
    expect(within(pages[1]!).getByText("Page 2 of 2")).toBeInTheDocument();
    expect(within(pages[1]!).getByLabelText("Panel 5")).toBeInTheDocument();
    expect(within(pages[1]!).getByLabelText("Panel 8")).toBeInTheDocument();
  });

  it("shows exact authored title, byline, dialogue, and caption as read-only text", () => {
    const project = makeProjectWithDialogue("Tonight, I’ll touch the moon!");
    project.title = "Nova’s Moon Kite";
    project.localAuthorCredit = "M.";
    project.panels[0]!.overlays.push({
      id: "caption-1",
      kind: "caption",
      text: "A windy rooftop.",
      x: .08,
      y: .76,
      width: .84,
      height: .16,
    });

    render(
      <ComicPreview
        project={project}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Nova’s Moon Kite" })).toBeInTheDocument();
    expect(screen.getByText("By M.")).toBeInTheDocument();
    expect(screen.getByText("Tonight, I’ll touch the moon!")).toBeInTheDocument();
    expect(screen.getByText("A windy rooftop.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders only approved artwork and gives missing approval an honest placeholder", () => {
    const project = makeProjectWithDialogue("Exact words");
    const approved = makeImageVersion({
      id: "approved-art",
      localPath: "images/approved-art.png",
      status: "approved",
    });
    const candidate = makeImageVersion({
      id: "candidate-art",
      localPath: "images/candidate-art.png",
      status: "candidate",
    });
    project.panels[0]!.approvedImageVersionId = approved.id;
    project.panels[0]!.imageVersions = [candidate, approved];
    project.panels[1]!.imageVersions = [candidate];
    const imageUrl = vi.fn((_panelId: string, imageId: string) => `/test/${imageId}.png`);

    render(
      <ComicPreview
        project={project}
        imageUrl={imageUrl}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "Approved artwork for panel 1" }))
      .toHaveAttribute("src", "/test/approved-art.png");
    expect(imageUrl).toHaveBeenCalledWith(project.panels[0]!.id, "approved-art");
    expect(imageUrl).not.toHaveBeenCalledWith(project.panels[1]!.id, "candidate-art");
    expect(within(screen.getByLabelText("Panel 2")).getByText(
      "Approve artwork for this panel to include it in the comic.",
    )).toBeInTheDocument();
  });

  it("uses a normal PDF download link and returns to panel editing", async () => {
    const onBackToPanels = vi.fn();
    const user = userEvent.setup();

    render(
      <ComicPreview
        project={makeProjectWithDialogue("Exact words")}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/project%2Fid/export.pdf"
        onBackToPanels={onBackToPanels}
      />,
    );

    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute(
      "href",
      "/api/projects/project%2Fid/export.pdf",
    );
    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute("download");
    await user.click(screen.getByRole("button", { name: "Back to panels" }));
    expect(onBackToPanels).toHaveBeenCalledOnce();
  });
});
