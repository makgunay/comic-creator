import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { Project } from "../../domain/project";
import { PdfExportError } from "./export-error";
import { buildPdfLayout, PDF_PAGE, type PdfOverlayLayout } from "./pdf-layout";

const missingApprovalMessage =
  "Approve artwork for every panel before downloading the PDF.";
const unsupportedGlyphMessage =
  "This comic uses a character the PDF cannot print yet. Change that character and try again.";
const textOverflowMessage =
  "Some comic text does not fit inside its box. Shorten that text and try again.";

interface FittedText {
  fontSize: number;
  lineHeight: number;
  lines: string[];
}

function assertEncodable(font: PDFFont, text: string): void {
  try {
    font.encodeText(text);
  } catch {
    throw new PdfExportError(unsupportedGlyphMessage);
  }
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] | undefined {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) return undefined;
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

function fitText(
  text: string,
  font: PDFFont,
  width: number,
  height: number,
  maximumSize: number,
  minimumSize: number,
): FittedText {
  const horizontalPadding = 10;
  const verticalPadding = 8;
  for (let fontSize = maximumSize; fontSize >= minimumSize; fontSize -= .5) {
    const lineHeight = fontSize * 1.18;
    const lines = wrapText(
      text,
      font,
      fontSize,
      width - horizontalPadding * 2,
    );
    if (
      lines
      && lines.length * lineHeight <= height - verticalPadding * 2
    ) {
      return { fontSize, lineHeight, lines };
    }
  }
  throw new PdfExportError(textOverflowMessage);
}

function fitSingleLine(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maximumSize: number,
  minimumSize: number,
): number {
  for (let size = maximumSize; size >= minimumSize; size -= .5) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return size;
  }
  throw new PdfExportError(textOverflowMessage);
}

function drawOverlay(
  page: PDFPage,
  overlay: PdfOverlayLayout,
  font: PDFFont,
): void {
  const fitted = fitText(overlay.text, font, overlay.width, overlay.height, 10, 7.5);
  page.drawRectangle({
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
    color: overlay.kind === "caption" ? rgb(1, .976, .863) : rgb(1, 1, 1),
    borderWidth: 1.5,
    borderColor: rgb(.12, .12, .12),
    opacity: .95,
  });
  const blockHeight = fitted.lines.length * fitted.lineHeight;
  const firstBaseline = overlay.y
    + (overlay.height + blockHeight) / 2
    - fitted.fontSize;
  fitted.lines.forEach((line, index) => {
    if (!line) return;
    const lineWidth = font.widthOfTextAtSize(line, fitted.fontSize);
    const centeredX = overlay.kind === "dialogue"
      ? overlay.x + Math.max(5, (overlay.width - lineWidth) / 2)
      : overlay.x + 10;
    page.drawText(line, {
      x: centeredX,
      y: firstBaseline - index * fitted.lineHeight,
      font,
      size: fitted.fontSize,
      color: rgb(.12, .12, .12),
    });
  });
}

function approvedVersionIds(project: Project): string[] {
  return [...project.panels]
    .sort((left, right) => left.order - right.order)
    .map((panel) => {
      const id = panel.approvedImageVersionId;
      const version = id
        ? panel.imageVersions.find((candidate) => candidate.id === id)
        : undefined;
      if (
        !id
        || !version
        || version.status !== "approved"
        || version.localPath !== `images/${id}.png`
      ) {
        throw new PdfExportError(missingApprovalMessage);
      }
      return id;
    });
}

export async function renderComicPdf(
  project: Project,
  resolveImage: (
    projectId: string,
    imageId: string,
  ) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  approvedVersionIds(project);
  const layouts = buildPdfLayout(project);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const layout of layouts) {
    assertEncodable(font, layout.title);
    assertEncodable(font, layout.byline);
    fitSingleLine(
      layout.title,
      bold,
      PDF_PAGE.width - PDF_PAGE.margin * 2,
      20,
      10,
    );
    fitSingleLine(
      layout.byline,
      font,
      PDF_PAGE.width - PDF_PAGE.margin * 2,
      10,
      7,
    );
    for (const overlay of layout.panels.flatMap((panel) => panel.overlays)) {
      assertEncodable(font, overlay.text);
      fitText(overlay.text, bold, overlay.width, overlay.height, 10, 7.5);
    }
  }

  for (const layout of layouts) {
    [
      layout.title,
      layout.byline,
      `Page ${layout.pageNumber} of ${layout.pageCount}`,
      ...layout.panels.flatMap((panel) =>
        panel.overlays.map((overlay) => overlay.text)),
    ].forEach((text) => assertEncodable(font, text));

    const page = pdf.addPage([PDF_PAGE.width, PDF_PAGE.height]);
    const titleSize = fitSingleLine(
      layout.title,
      bold,
      PDF_PAGE.width - PDF_PAGE.margin * 2,
      20,
      10,
    );
    const bylineSize = fitSingleLine(
      layout.byline,
      font,
      PDF_PAGE.width - PDF_PAGE.margin * 2,
      10,
      7,
    );
    page.drawText(layout.title, {
      x: PDF_PAGE.margin,
      y: PDF_PAGE.height - PDF_PAGE.margin - titleSize,
      font: bold,
      size: titleSize,
      color: rgb(.12, .12, .12),
    });
    page.drawText(layout.byline, {
      x: PDF_PAGE.margin,
      y: PDF_PAGE.height - PDF_PAGE.margin - titleSize - 18,
      font,
      size: bylineSize,
      color: rgb(.12, .12, .12),
    });

    for (const panel of layout.panels) {
      const imageId = panel.approvedImageVersionId;
      if (!imageId) throw new PdfExportError(missingApprovalMessage);
      const resolvedBytes = await resolveImage(project.id, imageId);
      const image = await pdf.embedPng(Uint8Array.from(resolvedBytes));
      page.drawRectangle({
        x: panel.x,
        y: panel.y,
        width: panel.width,
        height: panel.height,
        color: rgb(.95, .92, .86),
        borderWidth: 2,
        borderColor: rgb(.12, .12, .12),
      });
      page.drawImage(image, {
        x: panel.x + 2,
        y: panel.y + 2,
        width: panel.width - 4,
        height: panel.height - 4,
      });
      panel.overlays.forEach((overlay) => drawOverlay(page, overlay, bold));
    }

    const pageLabel = `Page ${layout.pageNumber} of ${layout.pageCount}`;
    const pageLabelWidth = bold.widthOfTextAtSize(pageLabel, 10);
    page.drawText(pageLabel, {
      x: (PDF_PAGE.width - pageLabelWidth) / 2,
      y: PDF_PAGE.margin,
      font: bold,
      size: 10,
      color: rgb(.12, .12, .12),
    });
  }
  return pdf.save();
}
