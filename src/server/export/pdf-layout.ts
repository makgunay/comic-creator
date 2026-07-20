import type { Project } from "../../domain/project";
import { paginatePanels } from "../../domain/pagination";
import { PdfExportError } from "./export-error";

export const PDF_PAGE = {
  width: 612,
  height: 792,
  margin: 36,
  header: 72,
  footer: 30,
  gutter: 12,
} as const;

export interface PdfOverlayLayout {
  kind: "dialogue" | "caption";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfArtBoxLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPanelLayout {
  panelId: string;
  panelNumber: number;
  approvedImageVersionId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  artBox: PdfArtBoxLayout;
  overlays: PdfOverlayLayout[];
}

export interface PdfPageLayout {
  title: string;
  byline: string;
  pageNumber: number;
  pageCount: number;
  panels: PdfPanelLayout[];
}

function assertContainedOverlay(
  overlay: Project["panels"][number]["overlays"][number],
): void {
  if (overlay.x + overlay.width > 1 || overlay.y + overlay.height > 1) {
    throw new PdfExportError(
      "A text box is outside its panel. Move it inside the panel and try again.",
    );
  }
}

export function buildPdfLayout(project: Project): PdfPageLayout[] {
  const panelSize = (
    PDF_PAGE.width - PDF_PAGE.margin * 2 - PDF_PAGE.gutter
  ) / 2;
  const pages = paginatePanels(project.panels);
  const gridHeight = panelSize * 2 + PDF_PAGE.gutter;
  const availableHeight = PDF_PAGE.height
    - PDF_PAGE.margin * 2
    - PDF_PAGE.header
    - PDF_PAGE.footer;
  const gridBottom = PDF_PAGE.margin
    + PDF_PAGE.footer
    + Math.max(0, (availableHeight - gridHeight) / 2);

  return pages.map((panels, pageIndex) => ({
    title: project.title,
    byline: `By ${project.localAuthorCredit || "A new comic author"}`,
    pageNumber: pageIndex + 1,
    pageCount: pages.length,
    panels: panels.map((panel, slot) => {
      const column = slot % 2;
      const row = Math.floor(slot / 2);
      const x = PDF_PAGE.margin + column * (panelSize + PDF_PAGE.gutter);
      const y = gridBottom + (1 - row) * (panelSize + PDF_PAGE.gutter);
      const artBox = {
        x: x + 2,
        y: y + 2,
        width: panelSize - 4,
        height: panelSize - 4,
      };
      panel.overlays.forEach(assertContainedOverlay);
      return {
        panelId: panel.id,
        panelNumber: panel.order + 1,
        ...(panel.approvedImageVersionId
          ? { approvedImageVersionId: panel.approvedImageVersionId }
          : {}),
        x,
        y,
        width: panelSize,
        height: panelSize,
        artBox,
        overlays: panel.overlays.map((overlay) => ({
          kind: overlay.kind,
          text: overlay.text,
          x: artBox.x + overlay.x * artBox.width,
          y: artBox.y
            + artBox.height
            - (overlay.y + overlay.height) * artBox.height,
          width: overlay.width * artBox.width,
          height: overlay.height * artBox.height,
        })),
      };
    }),
  }));
}
