import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app";
import { readConfig } from "../../src/server/config";
import { SampleProvider } from "../../src/server/storage/sample-provider";
import { ProjectStore } from "../../src/server/storage/project-store";
import { testTmpPath } from "../support/tmp-lifecycle";

const fixtureRoot = path.resolve("sample-assets/moon-kite");

function appFor(label: string) {
  const root = testTmpPath(label);
  const store = new ProjectStore(root);
  return createApp({
    config: readConfig({ DATA_DIR: root }),
    store,
    sampleProvider: new SampleProvider(fixtureRoot, store),
  });
}

describe("local API request boundary", () => {
  it.each([
    ["non-loopback Host", { host: "attacker.example" }],
    ["malformed Host", { host: "bad host" }],
    ["non-loopback Origin", { host: "127.0.0.1:4173", origin: "https://attacker.example" }],
    ["null Origin", { host: "127.0.0.1:4173", origin: "null" }],
    ["malformed Origin", { host: "127.0.0.1:4173", origin: "not a url" }],
    [
      "cross-site browser fetch",
      {
        host: "127.0.0.1:4173",
        origin: "http://localhost:5173",
        fetchSite: "cross-site",
      },
    ],
  ])("rejects %s before an API route runs", async (_label, headers) => {
    let operation = request(appFor("local-boundary-hostile")).get("/api/health");
    operation = operation.set("host", headers.host);
    if ("origin" in headers && headers.origin) {
      operation = operation.set("origin", headers.origin);
    }
    if ("fetchSite" in headers && headers.fetchSite) {
      operation = operation.set("sec-fetch-site", headers.fetchSite);
    }

    const response = await operation;

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "storage",
        message: expect.any(String),
        retryable: false,
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /attacker|origin|host|dns|path|stack|secret|internal/i,
    );
  });

  it("rejects hostile browser form actions and same-origin non-JSON actions", async () => {
    const app = appFor("local-boundary-form");
    const hostile = await request(app)
      .post("/api/projects/sample")
      .set("host", "127.0.0.1:4173")
      .set("origin", "https://attacker.example")
      .set("sec-fetch-site", "cross-site")
      .type("form")
      .send({});
    const sameOriginForm = await request(app)
      .post("/api/projects/sample")
      .set("host", "127.0.0.1:4173")
      .set("origin", "http://localhost:5173")
      .set("sec-fetch-site", "same-site")
      .type("form")
      .send({});

    expect(hostile.status).toBe(403);
    expect(sameOriginForm.status).toBe(415);
    for (const response of [hostile, sameOriginForm]) {
      expect(response.body.error).toMatchObject({
        code: "storage",
        retryable: false,
      });
      expect(JSON.stringify(response.body)).not.toMatch(
        /attacker|origin|host|content-type|stack|secret|internal/i,
      );
    }
  });

  it("allows loopback production, Vite-proxy, and header-light CLI requests", async () => {
    const app = appFor("local-boundary-controls");
    const production = await request(app)
      .get("/api/health")
      .set("host", "127.0.0.1:4173")
      .set("origin", "http://127.0.0.1:4173")
      .set("sec-fetch-site", "same-origin");
    const vite = await request(app)
      .get("/api/config")
      .set("host", "localhost:4173")
      .set("origin", "http://localhost:5173")
      .set("sec-fetch-site", "same-site");
    const cli = await request(app)
      .get("/api/health")
      .set("host", "[::1]:4173");
    const jsonAction = await request(app)
      .post("/api/projects/sample")
      .set("host", "127.0.0.1:4173")
      .set("origin", "http://localhost:5173")
      .set("sec-fetch-site", "same-site")
      .send({});

    expect(production.status).toBe(200);
    expect(vite.status).toBe(200);
    expect(cli.status).toBe(200);
    expect(jsonAction.status).toBe(201);
  });
});
