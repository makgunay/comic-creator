import path from "node:path";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import sharp from "sharp";
import type { AppConfig } from "../config";
import { MAX_GENERATED_IMAGE_BYTES } from "../storage/project-store";
import {
  RenderingChoicesSchema,
  VisualInputSchema,
  type GeneratedImage,
  type GenerationProvider,
  type RenderingChoices,
  type VisualInput,
} from "./contracts";

type ProviderOperation =
  | "moderate"
  | "choose_rendering"
  | "generate_hero"
  | "generate_panel";

interface ProviderLogEntry {
  event: "openai_request_complete" | "openai_request_failed";
  operation: ProviderOperation;
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

function providerInvariant(message: string): Error & { code: "provider" } {
  return Object.assign(new Error(message), { code: "provider" as const });
}

function safeRequestId(value: unknown): string | undefined {
  return typeof value === "string" && /^req_[A-Za-z0-9_-]{1,128}$/.test(value)
    ? value
    : undefined;
}

function requestIdFromError(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("requestID" in error)) {
    return undefined;
  }
  return safeRequestId(error.requestID);
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
    let providerRequestId: string | undefined;
    try {
      const response = await this.client.moderations.create({
        model: this.config.OPENAI_MODERATION_MODEL,
        input: text,
      });
      providerRequestId = safeRequestId(response._request_id);
      const flagged = response.results[0]?.flagged;
      if (typeof flagged !== "boolean") {
        throw providerInvariant("Moderation response did not include a decision");
      }
      if (flagged) {
        throw Object.assign(new Error("Safety check blocked the request"), {
          code: "safety" as const,
        });
      }
      this.recordComplete("moderate", started, providerRequestId);
    } catch (error) {
      this.recordFailure("moderate", started, error, providerRequestId);
      throw error;
    }
  }

  async chooseRendering(input: VisualInput): Promise<RenderingChoices> {
    const sanitized = VisualInputSchema.safeParse(input);
    if (!sanitized.success) {
      throw compilerInvariant("Visual input violated the compiler schema");
    }
    const started = performance.now();
    let providerRequestId: string | undefined;
    try {
      const response = await this.client.responses.parse({
        model: this.config.OPENAI_TEXT_MODEL,
        reasoning: { effort: "low" },
        input: [
          {
            role: "system",
            content:
              "Choose only the requested rendering parameters for the supplied visual facts. Return no prose and do not rewrite or add story content.",
          },
          { role: "user", content: JSON.stringify(sanitized.data) },
        ],
        text: {
          format: zodTextFormat(RenderingChoicesSchema, "rendering_choices"),
        },
      });
      providerRequestId = safeRequestId(response._request_id);
      if (!response.output_parsed) {
        throw compilerInvariant("No rendering choices returned");
      }
      const parsed = RenderingChoicesSchema.safeParse(response.output_parsed);
      if (!parsed.success) {
        throw compilerInvariant("Rendering choices violated the compiler schema");
      }
      this.recordComplete("choose_rendering", started, providerRequestId);
      return parsed.data;
    } catch (error) {
      this.recordFailure("choose_rendering", started, error, providerRequestId);
      throw error;
    }
  }

  async generateHero(prompt: string): Promise<GeneratedImage> {
    const started = performance.now();
    let providerRequestId: string | undefined;
    try {
      const response = await this.client.images.generate({
        model: this.config.OPENAI_IMAGE_MODEL,
        prompt,
        size: "1024x1024",
        quality: "low",
        output_format: "png",
      });
      providerRequestId = safeRequestId(response._request_id);
      const image = this.generatedImage(response);
      const durationMs = this.recordComplete(
        "generate_hero",
        started,
        providerRequestId,
      );
      return { ...image, durationMs };
    } catch (error) {
      this.recordFailure("generate_hero", started, error, providerRequestId);
      throw error;
    }
  }

  async generatePanel(referencePath: string, prompt: string): Promise<GeneratedImage> {
    const started = performance.now();
    let providerRequestId: string | undefined;
    try {
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
      providerRequestId = safeRequestId(response._request_id);
      const image = this.generatedImage(response);
      const durationMs = this.recordComplete(
        "generate_panel",
        started,
        providerRequestId,
      );
      return { ...image, durationMs };
    } catch (error) {
      this.recordFailure("generate_panel", started, error, providerRequestId);
      throw error;
    }
  }

  private generatedImage(
    response: ImageResponse,
  ): Omit<GeneratedImage, "durationMs"> {
    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("Image response did not include data");
    }
    const maximumBase64Length = Math.ceil(MAX_GENERATED_IMAGE_BYTES / 3) * 4 + 4;
    if (base64.length > maximumBase64Length) {
      throw providerInvariant("Image response exceeded the local byte budget");
    }
    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength > MAX_GENERATED_IMAGE_BYTES) {
      throw providerInvariant("Image response exceeded the local byte budget");
    }
    const providerRequestId = safeRequestId(response._request_id);
    return {
      bytes,
      ...(providerRequestId ? { providerRequestId } : {}),
    };
  }

  private recordComplete(
    operation: ProviderOperation,
    started: number,
    providerRequestId?: string,
  ): number {
    const durationMs = Math.round(performance.now() - started);
    this.log({
      event: "openai_request_complete",
      operation,
      durationMs,
      ...(providerRequestId ? { providerRequestId } : {}),
    });
    return durationMs;
  }

  private recordFailure(
    operation: ProviderOperation,
    started: number,
    error: unknown,
    knownRequestId?: string,
  ): void {
    const providerRequestId = knownRequestId ?? requestIdFromError(error);
    this.log({
      event: "openai_request_failed",
      operation,
      durationMs: Math.round(performance.now() - started),
      ...(providerRequestId ? { providerRequestId } : {}),
    });
  }
}
