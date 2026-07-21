import { Router } from "express";
import { ProjectSchema } from "../../domain/project";
import type { SampleProvider } from "../storage/sample-provider";
import type { ProjectStore } from "../storage/project-store";

const mismatchError = {
  error: {
    code: "storage",
    message: "Project id mismatch",
    retryable: false,
  },
} as const;

export function createProjectRouter(
  store: ProjectStore,
  sampleProvider: SampleProvider,
) {
  const router = Router();

  router.post("/projects", async (request, response) => {
    const project = await store.create(request.body);
    response.status(201).set("cache-control", "no-store").json(project);
  });

  router.post("/projects/sample", async (_request, response) => {
    response
      .status(201)
      .set("cache-control", "no-store")
      .json(await sampleProvider.copyToProject());
  });

  router.get("/projects/:id", async (request, response) => {
    response
      .set("cache-control", "no-store")
      .json(await store.load(request.params.id));
  });

  router.put("/projects/:id", async (request, response) => {
    const project = ProjectSchema.parse(request.body);
    if (project.id !== request.params.id) {
      response.status(400).set("cache-control", "no-store").json(mismatchError);
      return;
    }
    const updated = { ...project, updatedAt: new Date().toISOString() };
    await store.save(updated);
    response.set("cache-control", "no-store").json(updated);
  });

  return router;
}
