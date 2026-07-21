import fs from "node:fs/promises";
import path from "node:path";
import type OpenAI from "openai";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../../src/server/config";
import { OpenAIGenerationProvider } from "../../src/server/generation/openai-provider";
import { MAX_GENERATED_IMAGE_BYTES } from "../../src/server/storage/project-store";
import { makeTestTmpDirectory } from "../support/tmp-lifecycle";

const config = readConfig({ OPENAI_API_KEY: "test-key" });

const input = {
  heroDescription: "Nova has curly hair and round goggles.",
  action: "Nova pulls a moon kite.",
  setting: "A rooftop at night.",
  mood: "brave",
  framing: "show the full kite line",
  styleNotes: "Bold ink.",
  revisionDirection: "",
};

async function createReferenceImage(): Promise<string> {
  const temporaryDirectory = await makeTestTmpDirectory("provider-test");
  const referencePath = path.join(temporaryDirectory, "hero.png");
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: "#6d28d9",
    },
  })
    .png()
    .toFile(referencePath);
  return referencePath;
}

function createClient(overrides: Record<string, unknown> = {}) {
  return {
    moderations: {
      create: vi.fn().mockResolvedValue({
        results: [{ flagged: false }],
        _request_id: "req_moderation",
      }),
    },
    responses: {
      parse: vi.fn().mockResolvedValue({
        output_parsed: {
          shotSize: "wide",
          cameraAngle: "eye_level",
          lighting: "moonlit",
          palette: "cool",
          focus: "action",
        },
        _request_id: "req_rendering",
      }),
    },
    images: {
      generate: vi.fn().mockResolvedValue({
        data: [{ b64_json: Buffer.from("hero").toString("base64") }],
        _request_id: "req_hero",
      }),
      edit: vi.fn().mockResolvedValue({
        data: [{ b64_json: Buffer.from("panel").toString("base64") }],
        _request_id: "req_panel",
      }),
    },
    ...overrides,
  } as unknown as OpenAI;
}

describe("OpenAIGenerationProvider", () => {
  it("rejects decoded provider images above the bounded byte budget", async () => {
    const oversized = Buffer.alloc(MAX_GENERATED_IMAGE_BYTES + 1).toString("base64");
    const client = createClient({
      images: {
        generate: vi.fn().mockResolvedValue({
          data: [{ b64_json: oversized }],
          _request_id: "req_oversized",
        }),
        edit: vi.fn(),
      },
    });
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });

    await expect(provider.generateHero("hero prompt")).rejects.toMatchObject({
      code: "provider",
    });
  });
  it("constructs the constrained moderation and rendering requests", async () => {
    const client = createClient();
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });

    await provider.moderate("safe visual description");
    await expect(provider.chooseRendering(input)).resolves.toEqual({
      shotSize: "wide",
      cameraAngle: "eye_level",
      lighting: "moonlit",
      palette: "cool",
      focus: "action",
    });

    expect(client.moderations.create).toHaveBeenCalledWith({
      model: "omni-moderation-latest",
      input: "safe visual description",
    });
    expect(client.responses.parse).toHaveBeenCalledTimes(1);
    const request = vi.mocked(client.responses.parse).mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
    });
    expect(JSON.stringify(request)).not.toContain("dialogue");
    expect(JSON.stringify(request)).not.toContain("caption");
    expect(JSON.stringify(request)).not.toContain("author credit");
  });

  it("parses the compiler response through the strict rendering schema", async () => {
    const client = createClient({
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: {
            shotSize: "wide",
            cameraAngle: "eye_level",
            lighting: "moonlit",
            palette: "cool",
            focus: "action",
            plotAddition: "A dragon arrives.",
          },
          _request_id: "req_invalid",
        }),
      },
    });
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });

    await expect(provider.chooseRendering(input)).rejects.toThrow();
  });

  it("classifies story coaching with a signal-only structured response", async () => {
    const client = createClient({
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: { signal: "big_moment_needs_choice" },
          _request_id: "req_coach",
        }),
      },
    });
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });
    const story = {
      setup: "Mira walks in the forest.",
      problem: "Her dog runs away.",
      bigMoment: "Mira follows the path.",
      ending: "They are together again.",
    };

    await expect(provider.classifyStory(story)).resolves.toEqual({
      signal: "big_moment_needs_choice",
    });

    const request = vi.mocked(client.responses.parse).mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      input: [
        expect.objectContaining({ role: "system" }),
        { role: "user", content: JSON.stringify(story) },
      ],
    });
    const systemPrompt = JSON.stringify(request?.input?.[0]);
    expect(systemPrompt).toContain("A location alone means setup_needs_hero");
    expect(systemPrompt).toContain("Use setup_needs_setting only when the setup includes a hero");
    expect(JSON.stringify(request)).not.toMatch(/child-facing question|write a better|plotSuggestion/i);
  });

  it("rejects story-coach prose even when the provider returns a valid signal", async () => {
    const client = createClient({
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: {
            signal: "big_moment_needs_choice",
            question: "Should a dragon arrive?",
          },
          _request_id: "req_coach_invalid",
        }),
      },
    });
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });

    await expect(provider.classifyStory({
      setup: "A hero begins.",
      problem: "Something changes.",
      bigMoment: "The hero acts.",
      ending: "It ends.",
    })).rejects.toMatchObject({ code: "compiler_invariant" });
  });

  it("rejects extra runtime fields before they can reach the rendering model", async () => {
    const client = createClient();
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });
    const contaminatedInput = {
      ...input,
      dialogue: "This must stay local.",
      caption: "This must stay local too.",
      localAuthorCredit: "Private child name",
      arbitrary: "untrusted runtime value",
    };

    await expect(
      provider.chooseRendering(contaminatedInput),
    ).rejects.toMatchObject({ code: "compiler_invariant" });
    expect(client.responses.parse).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", { results: [], _request_id: "req_missing_moderation" }],
    [
      "malformed",
      { results: [{}], _request_id: "req_malformed_moderation" },
    ],
  ])("fails closed when moderation results are %s", async (_label, response) => {
    const client = createClient({
      moderations: { create: vi.fn().mockResolvedValue(response) },
    });
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });

    await expect(provider.moderate("private child content")).rejects.toMatchObject({
      code: "provider",
    });
  });

  it("constructs latency-bounded hero and supported reference edit requests", async () => {
    const referencePath = await createReferenceImage();
    const client = createClient();
    const provider = new OpenAIGenerationProvider(config, { client, log: vi.fn() });

    await expect(provider.generateHero("hero prompt")).resolves.toMatchObject({
      bytes: Buffer.from("hero"),
      providerRequestId: "req_hero",
    });
    await expect(provider.generatePanel(referencePath, "panel prompt")).resolves.toMatchObject({
      bytes: Buffer.from("panel"),
      providerRequestId: "req_panel",
    });

    expect(client.images.generate).toHaveBeenCalledWith({
      model: "gpt-image-2",
      prompt: "hero prompt",
      size: "1024x1024",
      quality: "low",
      output_format: "png",
    });
    expect(client.images.edit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.images.edit).mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-image-2",
      prompt: "panel prompt",
      size: "1024x1024",
      quality: "low",
      output_format: "png",
    });
    expect(vi.mocked(client.images.edit).mock.calls[0]?.[0]).not.toHaveProperty(
      "input_fidelity",
    );
    const uploadedReference = vi.mocked(client.images.edit).mock.calls[0]?.[0]
      ?.image as File;
    const uploadedMetadata = await sharp(
      Buffer.from(await uploadedReference.arrayBuffer()),
    ).metadata();
    expect(uploadedMetadata).toMatchObject({ width: 384, height: 384 });
  });

  it("logs the configured model for every successful operation using only safe metadata", async () => {
    const referencePath = await createReferenceImage();
    const log = vi.fn();
    const provider = new OpenAIGenerationProvider(config, {
      client: createClient(),
      log,
    });

    await provider.moderate("private moderation content");
    await provider.chooseRendering(input);
    await provider.generateHero("private child-authored prompt");
    await provider.generatePanel(referencePath, "private panel prompt");

    expect(log.mock.calls.map(([entry]) => entry)).toEqual([
      expect.objectContaining({ operation: "moderate", model: "omni-moderation-latest" }),
      expect.objectContaining({ operation: "choose_rendering", model: "gpt-5.6-luna" }),
      expect.objectContaining({ operation: "generate_hero", model: "gpt-image-2" }),
      expect.objectContaining({ operation: "generate_panel", model: "gpt-image-2" }),
    ]);

    const logs = JSON.stringify(log.mock.calls);
    expect(logs).toContain("req_moderation");
    expect(logs).toContain("req_rendering");
    expect(logs).toContain("req_hero");
    expect(logs).toContain("req_panel");
    expect(logs).toContain("durationMs");
    expect(logs).not.toContain("private moderation content");
    expect(logs).not.toContain("private child-authored prompt");
    expect(logs).not.toContain("private panel prompt");
    expect(logs).not.toContain(input.action);
    expect(logs).not.toContain(input.heroDescription);
    expect(logs).not.toContain("test-key");
  });

  it("logs safe failure metadata for moderation, compiler, and both image calls", async () => {
    const referencePath = await createReferenceImage();
    const failureCases = [
      {
        operation: "moderate",
        requestId: "req_failed_moderation",
        invoke: async (provider: OpenAIGenerationProvider) =>
          provider.moderate("private moderation content"),
        client: createClient({
          moderations: {
            create: vi.fn().mockRejectedValue(
              Object.assign(new Error("raw moderation provider body"), {
                requestID: "req_failed_moderation",
              }),
            ),
          },
        }),
      },
      {
        operation: "choose_rendering",
        requestId: "req_failed_rendering",
        invoke: async (provider: OpenAIGenerationProvider) =>
          provider.chooseRendering(input),
        client: createClient({
          responses: {
            parse: vi.fn().mockRejectedValue(
              Object.assign(new Error("raw compiler provider body"), {
                requestID: "req_failed_rendering",
              }),
            ),
          },
        }),
      },
      {
        operation: "generate_hero",
        requestId: "req_failed_hero",
        invoke: async (provider: OpenAIGenerationProvider) =>
          provider.generateHero("private hero prompt"),
        client: createClient({
          images: {
            generate: vi.fn().mockRejectedValue(
              Object.assign(new Error("raw hero provider body"), {
                requestID: "req_failed_hero",
              }),
            ),
            edit: vi.fn(),
          },
        }),
      },
      {
        operation: "generate_panel",
        requestId: "req_failed_panel",
        invoke: async (provider: OpenAIGenerationProvider) =>
          provider.generatePanel(referencePath, "private panel prompt"),
        client: createClient({
          images: {
            generate: vi.fn(),
            edit: vi.fn().mockRejectedValue(
              Object.assign(new Error("raw panel provider body"), {
                requestID: "req_failed_panel",
              }),
            ),
          },
        }),
      },
    ];

    for (const failureCase of failureCases) {
      const log = vi.fn();
      const provider = new OpenAIGenerationProvider(config, {
        client: failureCase.client,
        log,
      });

      await expect(failureCase.invoke(provider)).rejects.toThrow();
      expect(log).toHaveBeenCalledWith({
        event: "openai_request_failed",
        operation: failureCase.operation,
        model: failureCase.operation === "moderate"
          ? "omni-moderation-latest"
          : failureCase.operation === "choose_rendering"
            ? "gpt-5.6-luna"
            : "gpt-image-2",
        durationMs: expect.any(Number),
        providerRequestId: failureCase.requestId,
      });
      const serializedLogs = JSON.stringify(log.mock.calls);
      expect(serializedLogs).not.toContain("raw");
      expect(serializedLogs).not.toContain("private");
      expect(serializedLogs).not.toContain(input.action);
      expect(serializedLogs).not.toContain("test-key");
    }
  });
});
