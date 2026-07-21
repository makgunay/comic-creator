import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "../../src/domain/project";
import { buildPdfLayout } from "../../src/server/export/pdf-layout";
import {
  renderComicPdf,
  wrapPdfParagraph,
} from "../../src/server/export/pdf-renderer";
import {
  makeEightPanelProject,
  makeImageVersion,
  makeProjectWithDialogue,
} from "../fixtures/project-fixtures";
import { validPngBytes } from "../fixtures/generation-fixtures";

const fixturePng = () => validPngBytes();

function withApprovedPanels(project: Project): Project {
  for (const [index, panel] of project.panels.entries()) {
    const id = `approved-${index + 1}`;
    panel.approvedImageVersionId = id;
    panel.imageVersions = [
      makeImageVersion({
        id,
        localPath: `images/${id}.png`,
        status: "approved",
      }),
      makeImageVersion({
        id: `candidate-${index + 1}`,
        localPath: `images/candidate-${index + 1}.png`,
        status: "candidate",
      }),
    ];
  }
  return project;
}

describe("PDF layout and rendering", () => {
  it("preserves exact dialogue and normalized geometry in square panel layouts", () => {
    const project = makeProjectWithDialogue("We made our own moonlight.");
    const overlay = project.panels[0]!.overlays[0]!;
    const panel = buildPdfLayout(project)[0]!.panels[0]!;
    const command = panel.overlays[0]!;

    expect(command.text).toBe("We made our own moonlight.");
    expect(panel.width).toBe(panel.height);
    expect(panel.artBox).toEqual({
      x: panel.x + 2,
      y: panel.y + 2,
      width: panel.width - 4,
      height: panel.height - 4,
    });
    expect(command.x).toBeCloseTo(panel.artBox.x + overlay.x * panel.artBox.width);
    expect(command.y).toBeCloseTo(
      panel.artBox.y
        + panel.artBox.height
        - (overlay.y + overlay.height) * panel.artBox.height,
    );
    expect(command.width).toBeCloseTo(overlay.width * panel.artBox.width);
    expect(command.height).toBeCloseTo(overlay.height * panel.artBox.height);
  });

  it("does not draw local overlays over approved embedded lettering", () => {
    const project = withApprovedPanels(makeProjectWithDialogue("Already embedded"));
    const approved = project.panels[0]!.imageVersions.find(
      (version) => version.id === project.panels[0]!.approvedImageVersionId,
    )!;
    approved.letteringMode = "embedded";
    approved.letteringSnapshot = structuredClone(project.panels[0]!.overlays);

    expect(buildPdfLayout(project)[0]!.panels[0]!.overlays).toEqual([]);
  });

  it("excludes stale embedded artwork and refuses to export its raster", async () => {
    const project = withApprovedPanels(makeProjectWithDialogue("Move me"));
    const approved = project.panels[0]!.imageVersions.find(
      (version) => version.id === project.panels[0]!.approvedImageVersionId,
    )!;
    approved.letteringMode = "embedded";
    approved.letteringSnapshot = structuredClone(project.panels[0]!.overlays);
    project.panels[0]!.overlays[0]!.x += 0.1;

    const layout = buildPdfLayout(project)[0]!.panels[0]!;
    expect(layout.approvedImageVersionId).toBeUndefined();
    expect(layout.overlays[0]?.text).toBe("Move me");

    const resolveImage = vi.fn(async () => fixturePng());
    await expect(renderComicPdf(project, resolveImage)).rejects.toMatchObject({
      code: "export",
      message: "Re-draw panels after editing their word boxes before downloading the PDF.",
    });
    expect(resolveImage).not.toHaveBeenCalled();
  });

  it("keeps legacy embedded artwork and suppresses duplicate local overlays", () => {
    const project = withApprovedPanels(makeProjectWithDialogue("Legacy lettering"));
    const approved = project.panels[0]!.imageVersions.find(
      (version) => version.id === project.panels[0]!.approvedImageVersionId,
    )!;
    approved.letteringMode = "embedded";

    const layout = buildPdfLayout(project)[0]!.panels[0]!;
    expect(layout.approvedImageVersionId).toBe(approved.id);
    expect(layout.overlays).toEqual([]);
  });

  it("preserves leading, repeated, and trailing ASCII spaces across soft wraps", () => {
    const authored = "  Two  spaces and trailing  ";
    const lines = wrapPdfParagraph(authored, (value) => value.length, 9);

    expect(lines).toBeDefined();
    expect(lines!.join("")).toBe(authored);
    expect(lines![0]).toMatch(/^ {2}/);
    expect(lines!.join("")).toMatch(/Two {2}spaces/);
    expect(lines!.at(-1)).toMatch(/ {2}$/);
  });

  it("renders authored repeated spaces without changing the layout command", async () => {
    const authored = "  Two  spaces and trailing  ";
    const project = withApprovedPanels(makeProjectWithDialogue(authored));

    const bytes = await renderComicPdf(project, async () => fixturePng());

    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(buildPdfLayout(project)[0]!.panels[0]!.overlays[0]!.text)
      .toBe(authored);
  });

  it("emits two PDF pages for eight ordered panels and resolves only approved versions", async () => {
    const project = withApprovedPanels(makeEightPanelProject());
    const png = await fixturePng();
    const resolveImage = vi.fn(async (_projectId: string, _imageId: string) => png);

    const bytes = await renderComicPdf(project, resolveImage);
    const document = await PDFDocument.load(bytes);

    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(document.getPageCount()).toBe(2);
    expect(resolveImage.mock.calls.map((call) => call[1])).toEqual(
      Array.from({ length: 8 }, (_, index) => `approved-${index + 1}`),
    );
    expect(resolveImage.mock.calls.flat()).not.toContain("candidate-1");
  });

  it("encodes a curly apostrophe exactly without altering the authored text", async () => {
    const text = "Tonight, I’ll touch the moon!";
    const project = withApprovedPanels(makeProjectWithDialogue(text));
    const layoutText = buildPdfLayout(project)[0]!.panels[0]!.overlays[0]!.text;

    await expect(renderComicPdf(project, async () => fixturePng()))
      .resolves.toSatisfy((bytes: Uint8Array) =>
        Buffer.from(bytes).subarray(0, 5).toString() === "%PDF-");
    expect(layoutText).toBe(text);
  });

  it("fails visibly when child text contains a glyph the standard font cannot encode", async () => {
    const project = withApprovedPanels(makeProjectWithDialogue("Fly high 🪁"));

    await expect(renderComicPdf(project, async () => fixturePng())).rejects.toMatchObject({
      code: "export",
      message: "This comic uses a character the PDF cannot print yet. Change that character and try again.",
    });
  });

  it("fails rather than clipping or truncating a word that cannot fit its overlay", async () => {
    const project = withApprovedPanels(makeProjectWithDialogue("W".repeat(500)));

    await expect(renderComicPdf(project, async () => fixturePng())).rejects.toMatchObject({
      code: "export",
      message: "Some comic text does not fit inside its box. Shorten that text and try again.",
    });
  });

  it("requires approved artwork for every panel instead of exporting a candidate fallback", async () => {
    const project = makeProjectWithDialogue("Exact words");
    project.panels[0]!.imageVersions = [
      makeImageVersion({
        id: "candidate-only",
        localPath: "images/candidate-only.png",
        status: "candidate",
      }),
    ];
    const resolveImage = vi.fn(async () => fixturePng());

    await expect(renderComicPdf(project, resolveImage)).rejects.toMatchObject({
      code: "export",
      message: "Approve artwork for every panel before downloading the PDF.",
    });
    expect(resolveImage).not.toHaveBeenCalled();
  });
});
