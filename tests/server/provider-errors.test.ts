import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { toApiError } from "../../src/server/generation/provider-errors";

function codedError(code: string): Error & { code: string } {
  return Object.assign(new Error("raw provider details must stay private"), { code });
}

describe("toApiError", () => {
  it("maps authentication, quota, and rate limits to product-safe errors", () => {
    const headers = new Headers();
    const authentication = new OpenAI.AuthenticationError(
      401,
      { code: "invalid_api_key" },
      "raw authentication body",
      headers,
    );
    const quota = new OpenAI.RateLimitError(
      429,
      { code: "insufficient_quota" },
      "raw quota body",
      headers,
    );
    const rateLimit = new OpenAI.RateLimitError(
      429,
      { code: "rate_limit_exceeded" },
      "raw rate-limit body",
      headers,
    );

    expect(toApiError(authentication)).toEqual({
      error: {
        code: "authentication",
        message: "The local API key could not be used.",
        retryable: false,
      },
    });
    expect(toApiError(quota)).toEqual({
      error: {
        code: "quota",
        message: "This API project has no generation credit available.",
        retryable: false,
      },
    });
    expect(toApiError(rateLimit)).toEqual({
      error: {
        code: "rate_limit",
        message: "The illustrator is busy. Try again shortly.",
        retryable: true,
        retryAfterMs: 5000,
      },
    });
  });

  it("maps local safety and compiler failures without exposing raw messages", () => {
    expect(toApiError(codedError("safety"))).toMatchObject({
      error: { code: "safety", retryable: false },
    });
    expect(toApiError(codedError("compiler_invariant"))).toEqual({
      error: {
        code: "compiler_invariant",
        message: "The visual direction could not be validated.",
        retryable: true,
      },
    });
    expect(JSON.stringify(toApiError(new Error("raw child content")))).not.toContain(
      "raw child content",
    );
  });
});
