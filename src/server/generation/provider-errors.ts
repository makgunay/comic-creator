import OpenAI from "openai";
import type { ApiErrorPayload } from "../../domain/api";

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export function toApiError(error: unknown): ApiErrorPayload {
  if (hasCode(error, "missing_key")) {
    return {
      error: {
        code: "missing_key",
        message: "Add a local OpenAI API key to use live illustration.",
        retryable: false,
      },
    };
  }
  if (error instanceof OpenAI.AuthenticationError) {
    return {
      error: {
        code: "authentication",
        message: "The local API key could not be used.",
        retryable: false,
      },
    };
  }
  if (error instanceof OpenAI.APIError && error.code === "insufficient_quota") {
    return {
      error: {
        code: "quota",
        message: "This API project has no generation credit available.",
        retryable: false,
      },
    };
  }
  if (error instanceof OpenAI.RateLimitError) {
    return {
      error: {
        code: "rate_limit",
        message: "The illustrator is busy. Try again shortly.",
        retryable: true,
        retryAfterMs: 5000,
      },
    };
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return {
      error: {
        code: "network",
        message: "The illustrator could not be reached.",
        retryable: true,
      },
    };
  }
  if (hasCode(error, "rate_limit")) {
    return {
      error: {
        code: "rate_limit",
        message: "One illustration is already being drawn.",
        retryable: true,
        retryAfterMs: 1000,
      },
    };
  }
  if (hasCode(error, "safety")) {
    return {
      error: {
        code: "safety",
        message: "Try changing the visual direction.",
        retryable: false,
      },
    };
  }
  if (hasCode(error, "compiler_invariant")) {
    return {
      error: {
        code: "compiler_invariant",
        message: "The visual direction could not be validated.",
        retryable: true,
      },
    };
  }
  if (hasCode(error, "not_found")) {
    return {
      error: {
        code: "storage",
        message: "That saved item could not be found.",
        retryable: false,
      },
    };
  }
  return {
    error: {
      code: "provider",
      message: "The illustrator could not finish this version.",
      retryable: true,
    },
  };
}
