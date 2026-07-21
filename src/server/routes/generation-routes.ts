import { Router, type Response } from "express";
import { z, ZodError } from "zod";
import {
  PANEL_REVISION_MAX_LENGTH,
  type Project,
} from "../../domain/project";
import { CoachSignalSchema } from "../../domain/story-coach";
import type { GenerationService } from "../generation/generation-service";
import { toApiError } from "../generation/provider-errors";
import type { ProjectStore } from "../storage/project-store";

const EmptyBodySchema = z.strictObject({});
const PanelGenerationBodySchema = z.strictObject({
  revisionDirection: z.string().max(PANEL_REVISION_MAX_LENGTH),
  embeddedLettering: z.boolean().default(false),
});
const CoachBodySchema = z.strictObject({
  previousSignal: CoachSignalSchema.optional(),
});
const SAFE_ROUTE_ID = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,127}$/;
type InvalidRouteCode =
  | "invalid_project_id"
  | "invalid_panel_id"
  | "invalid_version_id"
  | "invalid_image_id";

function assertRouteId(value: string, code: InvalidRouteCode): void {
  if (!SAFE_ROUTE_ID.test(value)) {
    throw Object.assign(new Error("Invalid route identifier"), { code });
  }
}

function sourceCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String(error.code)
    : undefined;
}

function fail(response: Response, error: unknown): void {
  const code = sourceCode(error);
  const invalidRoute = [
    "invalid_project_id",
    "invalid_panel_id",
    "invalid_version_id",
    "invalid_image_id",
  ].includes(code ?? "");
  if (invalidRoute) {
    response.status(400).set("cache-control", "no-store").json({
      error: {
        code,
        message: "That local link is not valid.",
        retryable: false,
      },
    });
    return;
  }
  const artworkFailure = code === "reference_artwork";
  if (artworkFailure) {
    response.status(409).set("cache-control", "no-store").json({
      error: {
        code: "provider",
        message: "Approved hero artwork could not be read. Choose a hero and try again.",
        retryable: true,
      },
    });
    return;
  }
  if (code === "invalid_path") {
    response.status(409).set("cache-control", "no-store").json({
      error: {
        code: "storage",
        message: "The saved project storage could not be read.",
        retryable: true,
      },
    });
    return;
  }
  const invalid = error instanceof ZodError
    || code === "invalid_input";
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

  router.post("/projects/:projectId/coach", async (request, response) => {
    try {
      assertRouteId(request.params.projectId, "invalid_project_id");
      const body = CoachBodySchema.parse(request.body ?? {});
      response.set("cache-control", "no-store").json(
        await requireService(service).coachStory(
          request.params.projectId,
          body.previousSignal,
        ),
      );
    } catch (error) {
      fail(response, error);
    }
  });

  router.post("/projects/:projectId/hero/generate", async (request, response) => {
    try {
      assertRouteId(request.params.projectId, "invalid_project_id");
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
      assertRouteId(request.params.projectId, "invalid_project_id");
      assertRouteId(request.params.imageId, "invalid_image_id");
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
      assertRouteId(request.params.projectId, "invalid_project_id");
      assertRouteId(request.params.imageId, "invalid_image_id");
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
      assertRouteId(request.params.projectId, "invalid_project_id");
      assertRouteId(request.params.panelId, "invalid_panel_id");
      const body = PanelGenerationBodySchema.parse(request.body);
      response.status(201).set("cache-control", "no-store").json(projectPayload(
        await requireService(service).generatePanel(
          request.params.projectId,
          request.params.panelId,
          body.revisionDirection,
          body.embeddedLettering,
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
        assertRouteId(request.params.projectId, "invalid_project_id");
        assertRouteId(request.params.panelId, "invalid_panel_id");
        assertRouteId(request.params.versionId, "invalid_version_id");
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
        assertRouteId(request.params.projectId, "invalid_project_id");
        assertRouteId(request.params.panelId, "invalid_panel_id");
        assertRouteId(request.params.versionId, "invalid_version_id");
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
      assertRouteId(request.params.projectId, "invalid_project_id");
      assertRouteId(request.params.imageId, "invalid_image_id");
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
    } catch (error) {
      const code = sourceCode(error);
      if (code === "invalid_project_id" || code === "invalid_image_id") {
        fail(response, error);
      } else {
        response.status(404).set("cache-control", "no-store").json({
          error: {
            code: "storage",
            message: "Image not found.",
            retryable: false,
          },
        });
      }
    }
  });

  return router;
}
