export type ProviderErrorCode =
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_rejected_request"
  | "provider_protocol_error";

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: ProviderErrorCode,
    readonly provider: string,
    readonly statusCode = 502,
    readonly retryable = true,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ProviderError";
  }
}

export function normalizeProviderFailure(
  error: unknown,
  provider: string,
): ProviderError {
  if (error instanceof ProviderError) return error;
  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return new ProviderError(
      `${provider} request timed out or was cancelled`,
      "provider_timeout",
      provider,
      504,
      true,
      { cause: error },
    );
  }
  return new ProviderError(
    `${provider} is unavailable`,
    "provider_unavailable",
    provider,
    503,
    true,
    { cause: error },
  );
}
