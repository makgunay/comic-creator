import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ComicApiClient,
  ComicApiError,
} from "../../src/client/api/client";
import { makeProject } from "../fixtures/project-fixtures";

describe("ComicApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodes typed config and project responses", async () => {
    const project = makeProject();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ generationEnabled: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(project), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const api = new ComicApiClient();

    await expect(api.config()).resolves.toEqual({ generationEnabled: false });
    await expect(api.loadProject(project.id)).resolves.toEqual(project);
  });

  it("keeps malformed server bodies and secret-like values out of errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { message: "sk-secret-value" }, raw: "sk-secret-value" }),
      { status: 500, headers: { "content-type": "application/json" } },
    )));

    const error = await new ComicApiClient().config().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ComicApiError);
    expect(String(error)).not.toContain("sk-secret-value");
    expect((error as ComicApiError).payload).toEqual({
      code: "network",
      message: "The local app returned an unreadable response.",
      retryable: true,
    });
  });

  it("rejects even schema-shaped errors when their message looks sensitive", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        error: {
          code: "storage",
          message: "OPENAI_API_KEY=sk-secret-value",
          retryable: false,
        },
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    )));

    const error = await new ComicApiClient().config().catch((caught: unknown) => caught);

    expect(String(error)).not.toContain("sk-secret-value");
    expect((error as ComicApiError).payload).toEqual({
      code: "network",
      message: "The local app returned an unreadable response.",
      retryable: true,
    });
  });

  it("normalizes fetch failures without exposing the raw exception", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("request included sk-secret-value")));

    const error = await new ComicApiClient().copySample().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ComicApiError);
    expect(String(error)).not.toContain("sk-secret-value");
    expect((error as ComicApiError).payload.code).toBe("network");
  });
});
