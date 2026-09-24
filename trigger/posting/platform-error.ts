export interface PlatformErrorDetails {
  message: string;
  status?: number;
  data?: unknown;
}

export class PlatformApiError extends Error {
  readonly platformError: PlatformErrorDetails;

  constructor(message: string, platformError: PlatformErrorDetails) {
    super(message);
    this.name = "PlatformApiError";
    this.platformError = platformError;
  }
}

export function extractPlatformError(error: any): PlatformErrorDetails {
  if (error instanceof PlatformApiError) {
    return error.platformError;
  }

  if (error?.response) {
    return {
      message:
        error.response.data?.error?.message ||
        error.message ||
        "Unknown error",
      status: error.response.status,
      data: error.response.data,
    };
  }

  return { message: error?.message || "Unknown error" };
}

export function wrapPlatformError(
  error: any,
  context: string,
): PlatformApiError {
  const details = extractPlatformError(error);
  return new PlatformApiError(`${context}: ${details.message}`, details);
}
