import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ComicApiError,
  type PdfDownload,
} from "../../src/client/api/client";
import { ComicPreview } from "../../src/client/features/comic/ComicPreview";
import type { Project } from "../../src/domain/project";
import { makeClientApi } from "../fixtures/client-api-fixtures";
import { deferred } from "../fixtures/generation-fixtures";
import {
  makeEightPanelProject,
  makeImageVersion,
  makeProjectWithDialogue,
} from "../fixtures/project-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ComicPreview", () => {
  it("shows one numbered page at a time and navigates to panels five through eight", async () => {
    const project = makeEightPanelProject();
    const user = userEvent.setup();

    render(
      <ComicPreview
        project={project}
        api={makeClientApi(project)}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("article", { name: /Comic page/ })).toHaveLength(1);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Panel 5")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Panel 8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("offers a focused presentation mode that exits with Escape", async () => {
    const project = makeEightPanelProject();
    const user = userEvent.setup();
    render(
      <ComicPreview
        project={project}
        api={makeClientApi(project)}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Present my comic" }));
    expect(screen.getByRole("dialog", { name: "Comic presentation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit presentation" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Comic presentation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Present my comic" })).toHaveFocus();
  });

  it("celebrates the completed artifact and credits local co-authors", () => {
    const project = makeProjectWithDialogue("Exact words");
    project.collaboration = {
      enabled: true,
      authors: ["Ari", "Rowan"],
      activeAuthorIndex: 1,
    };
    project.localAuthorCredit = "Stale credit";
    render(
      <ComicPreview
        project={project}
        api={makeClientApi(project)}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    expect(screen.getByText("By Ari & Rowan")).toBeInTheDocument();
    expect(screen.getByText(/comic is ready for its premiere/i)).toBeInTheDocument();
    expect(screen.getByText(/Which moment are you most proud of/i)).toBeInTheDocument();
    expect(screen.getByText(/Comic complete/)).toBeInTheDocument();
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
        api={makeClientApi(project)}
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

  it("does not visibly double local overlays when approved artwork has embedded lettering", () => {
    const project = makeProjectWithDialogue("Already lettered");
    const approved = makeImageVersion({
      id: "lettered-art",
      localPath: "images/lettered-art.png",
      status: "approved",
      letteringMode: "embedded",
    });
    project.panels[0]!.approvedImageVersionId = approved.id;
    project.panels[0]!.imageVersions = [approved];

    render(
      <ComicPreview
        project={project}
        api={makeClientApi(project)}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    expect(screen.queryByText("Already lettered", { selector: ".comic-overlay" }))
      .not.toBeInTheDocument();
    expect(screen.getByText(/dialogue: already lettered/i, { selector: ".sr-only" }))
      .toBeInTheDocument();
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
        api={makeClientApi(project)}
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
        api={makeClientApi(makeProjectWithDialogue("Exact words"))}
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

  it("shows a safe visible export error and creates no file on a 409", async () => {
    const project = makeProjectWithDialogue("Exact words");
    const api = makeClientApi(project, {
      downloadPdf: vi.fn().mockRejectedValue(new ComicApiError({
        code: "export",
        message: "Approve artwork for every panel before downloading the PDF.",
        retryable: true,
      })),
    });
    const createObjectURL = vi.fn();
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const user = userEvent.setup();

    render(
      <ComicPreview
        project={project}
        api={api}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("link", { name: "Download PDF" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Approve artwork for every panel before downloading the PDF.",
    );
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("creates and revokes a successful PDF object URL after the server responds", async () => {
    const project = makeProjectWithDialogue("Exact words");
    const download: PdfDownload = {
      blob: new Blob(["%PDF-"], { type: "application/pdf" }),
      filename: "Test-Comic.pdf",
    };
    const downloadPdf = vi.fn().mockResolvedValue(download);
    const api = makeClientApi(project, { downloadPdf });
    const createObjectURL = vi.fn(() => "blob:comic-pdf");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(
      <ComicPreview
        project={project}
        api={api}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("link", { name: "Download PDF" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your PDF download is ready.",
    );
    expect(downloadPdf).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(download.blob);
    expect(anchorClick).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:comic-pdf");
  });

  it("ignores a stale PDF response after the project and API change", async () => {
    const firstProject = makeProjectWithDialogue("First");
    const secondProject = structuredClone(firstProject);
    secondProject.id = "second-project";
    const pending = deferred<PdfDownload>();
    const firstApi = makeClientApi(firstProject, {
      downloadPdf: vi.fn().mockReturnValue(pending.promise),
    });
    const secondApi = makeClientApi(secondProject);
    const createObjectURL = vi.fn(() => "blob:stale");
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    const view = render(
      <ComicPreview
        project={firstProject}
        api={firstApi}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/first/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("link", { name: "Download PDF" }));
    expect(firstApi.downloadPdf).toHaveBeenCalledOnce();
    view.rerender(
      <ComicPreview
        project={secondProject as Project}
        api={secondApi}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/second/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );
    await act(async () => pending.resolve({
      blob: new Blob(["%PDF-"], { type: "application/pdf" }),
      filename: "First.pdf",
    }));

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByText("Your PDF download is ready.")).not.toBeInTheDocument();
  });

  it("does not create a download or notice after unmount", async () => {
    const project = makeProjectWithDialogue("Exact words");
    const pending = deferred<PdfDownload>();
    const api = makeClientApi(project, {
      downloadPdf: vi.fn().mockReturnValue(pending.promise),
    });
    const createObjectURL = vi.fn(() => "blob:unmounted");
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
    const view = render(
      <ComicPreview
        project={project}
        api={api}
        imageUrl={(_panelId, imageId) => `/test/${imageId}.png`}
        exportUrl="/api/projects/test/export.pdf"
        onBackToPanels={vi.fn()}
      />,
    );

    screen.getByRole("link", { name: "Download PDF" }).click();
    expect(api.downloadPdf).toHaveBeenCalledOnce();
    view.unmount();
    await act(async () => pending.resolve({
      blob: new Blob(["%PDF-"], { type: "application/pdf" }),
      filename: "Test.pdf",
    }));

    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
