import { afterEach, describe, expect, it, vi } from "vitest";
import { ComicApiClient, ComicApiError } from "../../src/client/api/client";
import { makeProject } from "../fixtures/project-fixtures";

describe("generation client API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("validates whole-project responses and URL-encodes every id", async () => {
    const project = makeProject();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ project }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        project,
        heroReferenceChanged: false,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const api = new ComicApiClient();

    await expect(api.generatePanel("project/id", "panel/id", { revisionDirection: "Night" }))
      .resolves.toEqual({ project });
    await expect(api.approveHero("project/id", "image/id")).resolves.toEqual({
      project,
      heroReferenceChanged: false,
    });
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/projects/project%2Fid/panels/panel%2Fid/generate");
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/projects/project%2Fid/hero/image%2Fid/approve");
    expect(api.imageUrl("project/id", "image/id"))
      .toBe("/api/projects/project%2Fid/images/image%2Fid");
  });

  it("rejects malformed success payloads and secret-like error messages", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ project: { id: "broken" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: "provider",
          message: "Authorization: Bearer sk-secret-value",
          retryable: true,
        },
      }), { status: 502 })));
    const api = new ComicApiClient();

    const malformed = await api.generateHero("project").catch((error: unknown) => error);
    const secret = await api.rejectHeroCandidate("project", "candidate")
      .catch((error: unknown) => error);
    expect(malformed).toBeInstanceOf(ComicApiError);
    expect((malformed as ComicApiError).payload.code).toBe("network");
    expect(String(secret)).not.toContain("sk-secret-value");
  });
});
