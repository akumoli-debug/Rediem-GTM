import type { ProviderCapability } from "./types";

export type ProviderErrorOptions = {
  providerName: string;
  capability?: ProviderCapability;
  code?: string;
  statusCode?: number;
  retryAfterMs?: number;
  cause?: unknown;
};

export class ProviderError extends Error {
  providerName: string;
  capability?: ProviderCapability;
  code: string;
  statusCode?: number;
  retryAfterMs?: number;
  cause?: unknown;

  constructor(message: string, options: ProviderErrorOptions) {
    super(message);
    this.name = "ProviderError";
    this.providerName = options.providerName;
    this.capability = options.capability;
    this.code = options.code ?? "PROVIDER_ERROR";
    this.statusCode = options.statusCode;
    this.retryAfterMs = options.retryAfterMs;
    this.cause = options.cause;
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(message: string, options: ProviderErrorOptions) {
    super(message, {
      ...options,
      code: options.code ?? "PROVIDER_TIMEOUT"
    });
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(message: string, options: ProviderErrorOptions) {
    super(message, {
      ...options,
      code: options.code ?? "PROVIDER_RATE_LIMIT"
    });
    this.name = "ProviderRateLimitError";
  }
}
