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

/**
 * For the "200 OK but the body carries `{ error }`" case (e.g. Graph API
 * container-creation/publish calls) — builds a PlatformApiError directly
 * from the already-parsed response body instead of faking an axios error
 * shape just to route it through `wrapPlatformError`.
 */
export function wrapResponseDataError(
  data: any,
  context: string,
  status?: number,
): PlatformApiError {
  const details: PlatformErrorDetails = {
    message: data?.error?.message || "Unknown error",
    status,
    data,
  };
  return new PlatformApiError(`${context}: ${details.message}`, details);
}
