import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  environmentFiles,
  loadEnvironment,
  readConfig,
} from "../../src/server/config";
import { makeTestTmpDirectory } from "../support/tmp-lifecycle";

describe("server config", () => {
  it.each([undefined, "", "   \t  "])(
    "treats an absent or blank OpenAI API key as disabled",
    (apiKey) => {
      expect(readConfig({ OPENAI_API_KEY: apiKey }).OPENAI_API_KEY).toBeUndefined();
    },
  );

  it("preserves a non-empty OpenAI API key", () => {
    expect(readConfig({ OPENAI_API_KEY: "test-key" }).OPENAI_API_KEY).toBe(
      "test-key",
    );
  });

  it("uses only the required OpenAI models", () => {
    expect(readConfig({ OPENAI_API_KEY: "test-key" })).toMatchObject({
      OPENAI_TEXT_MODEL: "gpt-5.6-luna",
      OPENAI_IMAGE_MODEL: "gpt-image-2",
      OPENAI_MODERATION_MODEL: "omni-moderation-latest",
    });
  });

  it("loads .env.local before .env without overriding process values", () => {
    expect(environmentFiles("/workspace")).toEqual([
      { path: path.join("/workspace", ".env.local"), override: false },
      { path: path.join("/workspace", ".env"), override: false },
    ]);
  });

  it("keeps process values, then prefers .env.local values over .env values", async () => {
    const directory = await makeTestTmpDirectory("config-test");
    await fs.writeFile(
      path.join(directory, ".env.local"),
      "LOCAL_FIRST=from-local\nPROCESS_FIRST=from-local\n",
    );
    await fs.writeFile(
      path.join(directory, ".env"),
      "LOCAL_FIRST=from-env\nENV_ONLY=from-env\nPROCESS_FIRST=from-env\n",
    );
    const environment: NodeJS.ProcessEnv = { PROCESS_FIRST: "from-process" };

    loadEnvironment(directory, environment);

    expect(environment).toMatchObject({
      PROCESS_FIRST: "from-process",
      LOCAL_FIRST: "from-local",
      ENV_ONLY: "from-env",
    });
  });
});
