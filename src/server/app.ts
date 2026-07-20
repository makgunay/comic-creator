import path from "node:path";
import express, { type Express } from "express";
import { ZodError } from "zod";
import { readConfig, type AppConfig } from "./config";
import { GenerationService } from "./generation/generation-service";
import { OpenAIGenerationProvider } from "./generation/openai-provider";
import { createConfigRouter } from "./routes/config-routes";
import { createGenerationRouter } from "./routes/generation-routes";
import { createProjectRouter } from "./routes/project-routes";
import { SampleProvider } from "./storage/sample-provider";
import { ProjectStore } from "./storage/project-store";

export interface AppDependencies {
  config: AppConfig;
  store: ProjectStore;
  sampleProvider: SampleProvider;
  generationService?: GenerationService;
}

function defaultDependencies(): AppDependencies {
  const config = readConfig();
  const store = new ProjectStore(path.resolve(config.DATA_DIR));
  const generationService = config.OPENAI_API_KEY
    ? new GenerationService(store, new OpenAIGenerationProvider(config))
    : undefined;
  return {
    config,
    store,
    sampleProvider: new SampleProvider(
      path.resolve("sample-assets/moon-kite"),
      store,
    ),
    ...(generationService ? { generationService } : {}),
  };
}

export function createApp(
  dependencies: AppDependencies = defaultDependencies(),
): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_request, response) => response.json({ ok: true }));
  app.use("/api", createConfigRouter(dependencies.config));
  app.use(
    "/api",
    createProjectRouter(dependencies.store, dependencies.sampleProvider),
  );
  app.use(
    "/api",
    createGenerationRouter(dependencies.generationService, dependencies.store),
  );
  app.use((
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const code = error instanceof Error && "code" in error
      ? error.code
      : undefined;
    const status = error instanceof Error && "status" in error
      ? error.status
      : undefined;
    const missing = code === "not_found";
    const invalid = error instanceof ZodError
      || code === "invalid_path"
      || status === 400
      || status === 413;
    response
      .status(missing ? 404 : invalid ? 400 : 500)
      .set("cache-control", "no-store")
      .json({
        error: {
          code: "storage",
          message: missing
            ? "That saved project could not be found."
            : invalid
              ? "The project data needs to be corrected."
              : "The local project could not be saved.",
          retryable: !missing && !invalid,
        },
      });
  });
  return app;
}
