import path from "node:path";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import sharp from "sharp";
import type { AppConfig } from "../config";
import {
  RenderingChoicesSchema,
  type GeneratedImage,
  type GenerationProvider,
  type RenderingChoices,
  type VisualInput,
} from "./contracts";

interface ProviderLogEntry {
  event: "openai_request_complete";
  operation: "moderate" | "choose_rendering" | "generate_hero" | "generate_panel";
  durationMs: number;
  providerRequestId?: string;
}

type ProviderLogger = (entry: ProviderLogEntry) => void;

interface ProviderOptions {
  client?: OpenAI;
  log?: ProviderLogger;
}

interface ImageResponse {
  data?: Array<{ b64_json?: string | null }>;
  _request_id?: string | null;
}

function compilerInvariant(message: string): Error & { code: "compiler_invariant" } {
  return Object.assign(new Error(message), { code: "compiler_invariant" as const });
}

export class OpenAIGenerationProvider implements GenerationProvider {
  private readonly client: OpenAI;
  private readonly log: ProviderLogger;

  constructor(
    private readonly config: AppConfig,
    options: ProviderOptions = {},
  ) {
    if (!config.OPENAI_API_KEY && !options.client) {
      throw Object.assign(new Error("OPENAI_API_KEY is not configured"), {
        code: "missing_key" as const,
      });
    }
    this.client =
      options.client ?? new OpenAI({ apiKey: config.OPENAI_API_KEY, maxRetries: 0 });
    this.log =
      options.log ?? ((entry) => console.info(JSON.stringify(entry)));
  }

  async moderate(text: string): Promise<void> {
    const started = performance.now();
    const response = await this.client.moderations.create({
      model: this.config.OPENAI_MODERATION_MODEL,
      input: text,
    });
    this.record("moderate", started, response._request_id);
    if (response.results[0]?.flagged) {
      throw Object.assign(new Error("Safety check blocked the request"), {
        code: "safety" as const,
      });
    }
  }

  async chooseRendering(input: VisualInput): Promise<RenderingChoices> {
    const started = performance.now();
    const response = await this.client.responses.parse({
      model: this.config.OPENAI_TEXT_MODEL,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content:
            "Choose only the requested rendering parameters for the supplied visual facts. Return no prose and do not rewrite or add story content.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: {
        format: zodTextFormat(RenderingChoicesSchema, "rendering_choices"),
      },
    });
    this.record("choose_rendering", started, response._request_id);
    if (!response.output_parsed) {
      throw compilerInvariant("No rendering choices returned");
    }
    const parsed = RenderingChoicesSchema.safeParse(response.output_parsed);
    if (!parsed.success) {
      throw compilerInvariant("Rendering choices violated the compiler schema");
    }
    return parsed.data;
  }

  async generateHero(prompt: string): Promise<GeneratedImage> {
    const started = performance.now();
    const response = await this.client.images.generate({
      model: this.config.OPENAI_IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality: "low",
      output_format: "png",
    });
    return this.generatedImage("generate_hero", started, response);
  }

  async generatePanel(referencePath: string, prompt: string): Promise<GeneratedImage> {
    const started = performance.now();
    const referenceBytes = await sharp(referencePath)
      .resize({
        width: 384,
        height: 384,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    const response = await this.client.images.edit({
      model: this.config.OPENAI_IMAGE_MODEL,
      image: await toFile(referenceBytes, path.basename(referencePath), {
        type: "image/png",
      }),
      prompt,
      size: "1024x1024",
      quality: "low",
      output_format: "png",
    });
    return this.generatedImage("generate_panel", started, response);
  }

  private generatedImage(
    operation: "generate_hero" | "generate_panel",
    started: number,
    response: ImageResponse,
  ): GeneratedImage {
    const durationMs = Math.round(performance.now() - started);
    this.log({
      event: "openai_request_complete",
      operation,
      durationMs,
      ...(response._request_id
        ? { providerRequestId: response._request_id }
        : {}),
    });
    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("Image response did not include data");
    }
    return {
      bytes: Buffer.from(base64, "base64"),
      durationMs,
      ...(response._request_id
        ? { providerRequestId: response._request_id }
        : {}),
    };
  }

  private record(
    operation: "moderate" | "choose_rendering",
    started: number,
    providerRequestId?: string | null,
  ): void {
    this.log({
      event: "openai_request_complete",
      operation,
      durationMs: Math.round(performance.now() - started),
      ...(providerRequestId ? { providerRequestId } : {}),
    });
  }
}
