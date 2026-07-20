import { Router, type Response } from "express";
import { z, ZodError } from "zod";
import type { Project } from "../../domain/project";
import type { GenerationService } from "../generation/generation-service";
import { toApiError } from "../generation/provider-errors";
import type { ProjectStore } from "../storage/project-store";

const EmptyBodySchema = z.strictObject({});
const PanelGenerationBodySchema = z.strictObject({
  revisionDirection: z.string().max(500),
});

function sourceCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String(error.code)
    : undefined;
}

function fail(response: Response, error: unknown): void {
  const code = sourceCode(error);
  const invalid = error instanceof ZodError
    || code === "invalid_input"
    || code === "invalid_path";
  const payload = invalid
    ? {
        error: {
          code: "storage" as const,
          message: "The illustration request needs to be corrected.",
          retryable: false,
        },
      }
    : toApiError(error);
  const status = code === "not_found"
    ? 404
    : invalid
      ? 400
      : payload.error.code === "missing_key"
        ? 503
        : payload.error.code === "rate_limit" || payload.error.code === "quota"
          ? 429
          : payload.error.code === "authentication"
            ? 401
            : payload.error.code === "safety"
              ? 400
              : 502;
  response.status(status).set("cache-control", "no-store").json(payload);
}

function requireService(service: GenerationService | undefined): GenerationService {
  if (!service) {
    throw Object.assign(new Error("Generation is not configured"), {
      code: "missing_key" as const,
    });
  }
  return service;
}

function projectPayload(project: Project) {
  return { project };
}

export function createGenerationRouter(
  service: GenerationService | undefined,
  store: ProjectStore,
) {
  const router = Router();

  router.post("/projects/:projectId/hero/generate", async (request, response) => {
    try {
      EmptyBodySchema.parse(request.body ?? {});
      response.status(201).set("cache-control", "no-store").json(
        projectPayload(await requireService(service).generateHero(request.params.projectId)),
      );
    } catch (error) {
      fail(response, error);
    }
  });

  router.post("/projects/:projectId/hero/:imageId/approve", async (request, response) => {
    try {
      EmptyBodySchema.parse(request.body ?? {});
      response.set("cache-control", "no-store").json(
        await requireService(service).approveHero(
          request.params.projectId,
          request.params.imageId,
        ),
      );
    } catch (error) {
      fail(response, error);
    }
  });

  router.post("/projects/:projectId/hero/:imageId/reject", async (request, response) => {
    try {
      EmptyBodySchema.parse(request.body ?? {});
      response.set("cache-control", "no-store").json(projectPayload(
        await requireService(service).rejectHeroCandidate(
          request.params.projectId,
          request.params.imageId,
        ),
      ));
    } catch (error) {
      fail(response, error);
    }
  });

  router.post("/projects/:projectId/panels/:panelId/generate", async (request, response) => {
    try {
      const body = PanelGenerationBodySchema.parse(request.body);
      response.status(201).set("cache-control", "no-store").json(projectPayload(
        await requireService(service).generatePanel(
          request.params.projectId,
          request.params.panelId,
          body.revisionDirection,
        ),
      ));
    } catch (error) {
      fail(response, error);
    }
  });

  router.post(
    "/projects/:projectId/panels/:panelId/versions/:versionId/approve",
    async (request, response) => {
      try {
        EmptyBodySchema.parse(request.body ?? {});
        response.set("cache-control", "no-store").json(projectPayload(
          await requireService(service).approvePanelVersion(
            request.params.projectId,
            request.params.panelId,
            request.params.versionId,
          ),
        ));
      } catch (error) {
        fail(response, error);
      }
    },
  );

  router.post(
    "/projects/:projectId/panels/:panelId/versions/:versionId/reject",
    async (request, response) => {
      try {
        EmptyBodySchema.parse(request.body ?? {});
        response.set("cache-control", "no-store").json(projectPayload(
          await requireService(service).rejectPanelCandidate(
            request.params.projectId,
            request.params.panelId,
            request.params.versionId,
          ),
        ));
      } catch (error) {
        fail(response, error);
      }
    },
  );

  router.get("/projects/:projectId/images/:imageId", async (request, response) => {
    try {
      const project = await store.load(request.params.projectId);
      const imageId = request.params.imageId;
      const member = [
        ...project.hero.imageVersions,
        ...project.panels.flatMap((panel) => panel.imageVersions),
      ].some((version) =>
        version.id === imageId
        && version.localPath === `images/${imageId}.png`);
      if (!member) {
        response.status(404).set("cache-control", "no-store").json({
          error: {
            code: "storage",
            message: "Image not found.",
            retryable: false,
          },
        });
        return;
      }
      const filename = await store.resolveImageAsset(project.id, imageId);
      response
        .type("png")
        .set("cache-control", "no-store")
        .sendFile(filename, (error) => {
          if (error && !response.headersSent) fail(response, error);
        });
    } catch {
      response.status(404).set("cache-control", "no-store").json({
        error: {
          code: "storage",
          message: "Image not found.",
          retryable: false,
        },
      });
    }
  });

  return router;
}
