import fs from "node:fs/promises";
import { Router, type Response } from "express";
import type { Project } from "../../domain/project";
import { PdfExportError } from "../export/export-error";
import { renderComicPdf } from "../export/pdf-renderer";
import type { ProjectStore } from "../storage/project-store";

function safeFilename(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "comic";
}

function sourceCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String(error.code)
    : undefined;
}

function fail(response: Response, error: unknown): void {
  const code = sourceCode(error);
  const invalidId = code === "invalid_path";
  const missingProject = code === "not_found";
  const knownExport = error instanceof PdfExportError;
  response
    .status(invalidId ? 400 : missingProject ? 404 : 409)
    .set("cache-control", "no-store")
    .json({
      error: {
        code: "export",
        message: invalidId
          ? "That project link is not valid."
          : missingProject
            ? "That saved project could not be found."
            : knownExport
              ? error.message
              : "Approved artwork could not be read. Check the panel approval and try again.",
        retryable: !invalidId && !missingProject,
      },
    });
}

function findApprovedVersion(
  project: Project,
  imageId: string,
): Project["panels"][number]["imageVersions"][number] | undefined {
  for (const panel of project.panels) {
    if (panel.approvedImageVersionId !== imageId) continue;
    const version = panel.imageVersions.find((candidate) =>
      candidate.id === imageId
      && candidate.status === "approved"
      && candidate.localPath === `images/${imageId}.png`);
    if (version) return version;
  }
  return undefined;
}

export function createExportRouter(store: ProjectStore) {
  const router = Router();

  router.get("/projects/:id/export.pdf", async (request, response) => {
    try {
      const project = await store.load(request.params.id);
      const bytes = await renderComicPdf(
        project,
        async (projectId, imageId) => {
          if (
            projectId !== project.id
            || !findApprovedVersion(project, imageId)
          ) {
            throw new PdfExportError(
              "Approve artwork for every panel before downloading the PDF.",
            );
          }
          return fs.readFile(await store.resolveImageAsset(projectId, imageId));
        },
      );
      response
        .status(200)
        .set({
          "content-type": "application/pdf",
          "content-disposition":
            `attachment; filename="${safeFilename(project.title)}.pdf"`,
          "cache-control": "no-store",
        })
        .send(Buffer.from(bytes));
    } catch (error) {
      fail(response, error);
    }
  });

  return router;
}
