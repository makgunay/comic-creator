import { z } from "zod";
import {
  CreateProjectInputSchema,
  ProjectSchema,
  type CreateProjectInput,
  type Project,
} from "../../domain/project";
import type { ApiErrorPayload } from "../../domain/api";

const ConfigResponseSchema = z.strictObject({
  generationEnabled: z.boolean(),
});

const ApiErrorCodeSchema = z.enum([
  "missing_key",
  "authentication",
  "quota",
  "rate_limit",
  "network",
  "safety",
  "compiler_invariant",
  "provider",
  "storage",
  "export",
]);

const ApiErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: ApiErrorCodeSchema,
    message: z.string().min(1).max(300),
    retryable: z.boolean(),
    retryAfterMs: z.number().int().nonnegative().optional(),
  }),
});

const ProjectResponseSchema = z.strictObject({
  project: ProjectSchema,
});

const HeroApprovalResponseSchema = z.strictObject({
  project: ProjectSchema,
  heroReferenceChanged: z.boolean(),
});

const PanelGenerationInputSchema = z.strictObject({
  revisionDirection: z.string().max(500),
});

export type PublicConfig = z.infer<typeof ConfigResponseSchema>;
export type GenerationConfigStatus = "loading" | "enabled" | "disabled" | "error";
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
export type HeroApprovalResponse = z.infer<typeof HeroApprovalResponseSchema>;
export type PanelGenerationInput = z.infer<typeof PanelGenerationInputSchema>;

export interface RequestOptions {
  signal?: AbortSignal;
  keepalive?: boolean;
}

export interface ComicApi {
  config(options?: RequestOptions): Promise<PublicConfig>;
  createProject(input: CreateProjectInput, options?: RequestOptions): Promise<Project>;
  copySample(options?: RequestOptions): Promise<Project>;
  loadProject(id: string, options?: RequestOptions): Promise<Project>;
  saveProject(project: Project, options?: RequestOptions): Promise<Project>;
  generateHero(projectId: string, options?: RequestOptions): Promise<ProjectResponse>;
  approveHero(projectId: string, imageId: string, options?: RequestOptions): Promise<HeroApprovalResponse>;
  rejectHeroCandidate(projectId: string, imageId: string, options?: RequestOptions): Promise<ProjectResponse>;
  generatePanel(projectId: string, panelId: string, input: PanelGenerationInput, options?: RequestOptions): Promise<ProjectResponse>;
  approvePanelVersion(projectId: string, panelId: string, versionId: string, options?: RequestOptions): Promise<ProjectResponse>;
  rejectPanelCandidate(projectId: string, panelId: string, versionId: string, options?: RequestOptions): Promise<ProjectResponse>;
  imageUrl(projectId: string, imageId: string): string;
}

const unreadableResponse: ApiErrorPayload["error"] = {
  code: "network",
  message: "The local app returned an unreadable response.",
  retryable: true,
};

const unavailableServer: ApiErrorPayload["error"] = {
  code: "network",
  message: "The local app could not be reached.",
  retryable: true,
};

function looksSensitive(message: string): boolean {
  return /\bsk-[a-zA-Z0-9_-]{8,}|\b(?:api[_ -]?key|authorization)\s*[:=]|\bbearer\s+/i.test(message);
}

export class ComicApiError extends Error {
  readonly name = "ComicApiError";

  constructor(readonly payload: ApiErrorPayload["error"]) {
    super(payload.message);
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) throw new ComicApiError(unreadableResponse);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ComicApiError(unreadableResponse);
  }
}

async function decode<T>(
  response: Response,
  parseSuccess: (value: unknown) => T,
): Promise<T> {
  const body = await parseJson(response);
  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(body);
    if (!parsedError.success) throw new ComicApiError(unreadableResponse);
    const { retryAfterMs, ...payload } = parsedError.data.error;
    if (looksSensitive(payload.message)) throw new ComicApiError(unreadableResponse);
    throw new ComicApiError({
      ...payload,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }
  try {
    return parseSuccess(body);
  } catch {
    throw new ComicApiError(unreadableResponse);
  }
}

function requestInit(
  method: "GET" | "POST" | "PUT",
  options: RequestOptions,
  body?: unknown,
): RequestInit {
  return {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
    ...(options.signal ? { signal: options.signal } : {}),
    keepalive: options.keepalive ?? false,
  };
}

export class ComicApiClient implements ComicApi {
  constructor(private readonly baseUrl = "/api") {}

  private async request<T>(
    path: string,
    init: RequestInit,
    parseSuccess: (value: unknown) => T,
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, init);
      return await decode(response, parseSuccess);
    } catch (error) {
      if (error instanceof ComicApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ComicApiError(unavailableServer);
    }
  }

  config(options: RequestOptions = {}): Promise<PublicConfig> {
    return this.request(
      "/config",
      requestInit("GET", options),
      ConfigResponseSchema.parse,
    );
  }

  createProject(
    input: CreateProjectInput,
    options: RequestOptions = {},
  ): Promise<Project> {
    const validInput = CreateProjectInputSchema.parse(input);
    return this.request(
      "/projects",
      requestInit("POST", options, validInput),
      ProjectSchema.parse,
    );
  }

  copySample(options: RequestOptions = {}): Promise<Project> {
    return this.request(
      "/projects/sample",
      requestInit("POST", options),
      ProjectSchema.parse,
    );
  }

  loadProject(id: string, options: RequestOptions = {}): Promise<Project> {
    return this.request(
      `/projects/${encodeURIComponent(id)}`,
      requestInit("GET", options),
      ProjectSchema.parse,
    );
  }

  saveProject(
    project: Project,
    options: RequestOptions = {},
  ): Promise<Project> {
    const validProject = ProjectSchema.parse(project);
    return this.request(
      `/projects/${encodeURIComponent(validProject.id)}`,
      requestInit("PUT", options, validProject),
      ProjectSchema.parse,
    );
  }

  generateHero(
    projectId: string,
    options: RequestOptions = {},
  ): Promise<ProjectResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectId)}/hero/generate`,
      requestInit("POST", options, {}),
      ProjectResponseSchema.parse,
    );
  }

  approveHero(
    projectId: string,
    imageId: string,
    options: RequestOptions = {},
  ): Promise<HeroApprovalResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectId)}/hero/${encodeURIComponent(imageId)}/approve`,
      requestInit("POST", options, {}),
      HeroApprovalResponseSchema.parse,
    );
  }

  rejectHeroCandidate(
    projectId: string,
    imageId: string,
    options: RequestOptions = {},
  ): Promise<ProjectResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectId)}/hero/${encodeURIComponent(imageId)}/reject`,
      requestInit("POST", options, {}),
      ProjectResponseSchema.parse,
    );
  }

  generatePanel(
    projectId: string,
    panelId: string,
    input: PanelGenerationInput,
    options: RequestOptions = {},
  ): Promise<ProjectResponse> {
    const validInput = PanelGenerationInputSchema.parse(input);
    return this.request(
      `/projects/${encodeURIComponent(projectId)}/panels/${encodeURIComponent(panelId)}/generate`,
      requestInit("POST", options, validInput),
      ProjectResponseSchema.parse,
    );
  }

  approvePanelVersion(
    projectId: string,
    panelId: string,
    versionId: string,
    options: RequestOptions = {},
  ): Promise<ProjectResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectId)}/panels/${encodeURIComponent(panelId)}/versions/${encodeURIComponent(versionId)}/approve`,
      requestInit("POST", options, {}),
      ProjectResponseSchema.parse,
    );
  }

  rejectPanelCandidate(
    projectId: string,
    panelId: string,
    versionId: string,
    options: RequestOptions = {},
  ): Promise<ProjectResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectId)}/panels/${encodeURIComponent(panelId)}/versions/${encodeURIComponent(versionId)}/reject`,
      requestInit("POST", options, {}),
      ProjectResponseSchema.parse,
    );
  }

  imageUrl(projectId: string, imageId: string): string {
    return `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/images/${encodeURIComponent(imageId)}`;
  }
}

export const comicApi: ComicApi = new ComicApiClient();
