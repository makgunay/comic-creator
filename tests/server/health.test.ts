import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app";

describe("GET /api/health", () => {
  it("reports the local server as ready", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns a JSON 404 for an unmatched API GET before the SPA fallback", async () => {
    const app = createApp();
    app.get("*splat", (_request, response) => {
      response.type("html").send("<main>Comic Creator</main>");
    });

    const response = await request(app).get("/api/not-a-real-route");

    expect(response.status).toBe(404);
    expect(response.type).toMatch(/^application\/json/);
    expect(response.body).toEqual({
      error: {
        code: "not_found",
        message: "API route not found.",
        retryable: false,
      },
    });
  });
});
