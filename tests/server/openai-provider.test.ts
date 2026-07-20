import fs from "node:fs/promises";
import path from "node:path";
import type OpenAI from "openai";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../../src/server/config";
import { OpenAIGenerationProvider } from "../../src/server/generation/openai-provider";

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

  it("constructs latency-bounded hero and supported reference edit requests", async () => {
    await fs.mkdir(path.resolve("tmp"), { recursive: true });
    const temporaryDirectory = await fs.mkdtemp(path.resolve("tmp/provider-test-"));
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

  it("logs only safe operation metadata", async () => {
    const log = vi.fn();
    const provider = new OpenAIGenerationProvider(config, {
      client: createClient(),
      log,
    });

    await provider.chooseRendering(input);
    await provider.generateHero("private child-authored prompt");

    const logs = JSON.stringify(log.mock.calls);
    expect(logs).toContain("req_rendering");
    expect(logs).toContain("req_hero");
    expect(logs).toContain("durationMs");
    expect(logs).not.toContain("private child-authored prompt");
    expect(logs).not.toContain(input.action);
    expect(logs).not.toContain(input.heroDescription);
  });
});
