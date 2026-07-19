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
  | "export";

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
  };
}
