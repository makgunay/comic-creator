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

  it("downloads only a validated PDF response with a safe server filename", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      new Uint8Array([37, 80, 68, 70, 45]),
      {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="Nova-Moon-Kite.pdf"',
        },
      },
    )));

    const result = await new ComicApiClient().downloadPdf("project/id");

    expect(result.filename).toBe("Nova-Moon-Kite.pdf");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.type).toBe("application/pdf");
    expect(fetch).toHaveBeenCalledWith(
      "/api/projects/project%2Fid/export.pdf",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("uses a deterministic filename when a PDF disposition is not safe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      new Uint8Array([37, 80, 68, 70, 45]),
      {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="../../unsafe.pdf"',
        },
      },
    )));

    await expect(new ComicApiClient().downloadPdf("project")).resolves
      .toMatchObject({ filename: "comic.pdf" });
  });

  it("decodes a safe JSON export error instead of treating it as a file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        error: {
          code: "export",
          message: "Approve artwork for every panel before downloading the PDF.",
          retryable: true,
        },
      }),
      {
        status: 409,
        headers: { "content-type": "application/json" },
      },
    )));

    const error = await new ComicApiClient().downloadPdf("project")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ComicApiError);
    expect((error as ComicApiError).payload).toEqual({
      code: "export",
      message: "Approve artwork for every panel before downloading the PDF.",
      retryable: true,
    });
  });

  it("rejects a 200 response that is not a validated PDF download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "<html>not a pdf</html>",
      {
        status: 200,
        headers: {
          "content-type": "text/html",
          "content-disposition": 'attachment; filename="not-safe.html"',
        },
      },
    )));

    const error = await new ComicApiClient().downloadPdf("project")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ComicApiError);
    expect((error as ComicApiError).payload).toMatchObject({
      code: "network",
      retryable: true,
    });
  });
});
