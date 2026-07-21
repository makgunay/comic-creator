import { Router } from "express";
import type { AppConfig } from "../config";

export function createConfigRouter(config: AppConfig) {
  const router = Router();
  router.get("/config", (_request, response) => {
    response
      .set("cache-control", "no-store")
      .json({ generationEnabled: Boolean(config.OPENAI_API_KEY) });
  });
  return router;
}
