export type ApiErrorCode =
  | "missing_key"
  | "authentication"
  | "quota"
  | "rate_limit"
  | "network"
  | "safety"
  | "compiler_invariant"
  | "provider"
  | "storage"
  | "export"
  | "invalid_project_id"
  | "invalid_panel_id"
  | "invalid_version_id"
  | "invalid_image_id";

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
  };
}
