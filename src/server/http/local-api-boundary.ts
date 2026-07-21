import type { NextFunction, Request, Response } from "express";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const forbiddenRequest = {
  error: {
    code: "storage",
    message: "This local request is not allowed.",
    retryable: false,
  },
} as const;

const unsupportedMedia = {
  error: {
    code: "storage",
    message: "This action must use JSON.",
    retryable: false,
  },
} as const;

function loopbackHostname(value: string): boolean {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname === "::1") return true;
  const octets = hostname.split(".");
  if (octets.length !== 4) return false;
  const numbers = octets.map((octet) =>
    /^\d{1,3}$/.test(octet) ? Number(octet) : Number.NaN);
  return numbers.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    && numbers[0] === 127;
}

function hostIsLoopback(value: string | undefined): boolean {
  if (!value || /[\s/@\\]/.test(value)) return false;
  try {
    const parsed = new URL(`http://${value}`);
    return parsed.username === ""
      && parsed.password === ""
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && loopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function originIsLoopback(value: string | undefined): boolean {
  if (value === undefined) return true;
  if (value === "null") return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.username === ""
      && parsed.password === ""
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && loopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function isJsonContentType(request: Request): boolean {
  const contentType = request.get("content-type");
  if (!contentType) return false;
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "application/json"
    || Boolean(mediaType?.endsWith("+json"));
}

export function enforceLocalApiBoundary(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (
    !hostIsLoopback(request.get("host"))
    || !originIsLoopback(request.get("origin"))
    || request.get("sec-fetch-site")?.toLowerCase() === "cross-site"
  ) {
    response
      .status(403)
      .set("cache-control", "no-store")
      .json(forbiddenRequest);
    return;
  }

  if (MUTATING_METHODS.has(request.method) && !isJsonContentType(request)) {
    response
      .status(415)
      .set("cache-control", "no-store")
      .json(unsupportedMedia);
    return;
  }

  next();
}
