import { describe, expect, test } from "bun:test";
import {
  extractPlatformError,
  PlatformApiError,
  wrapPlatformError,
} from "./platform-error";

// PFM-1218: failed post results were surfacing a generic axios message
// ("Request failed with status code 400") with `details: null` instead of
// the platform's actual structured error body. These tests cover the shared
// helper that both the token-refresh path (post-to-platform.ts,
// refresh-account-tokens.ts) and the Instagram post client rely on to
// preserve that body through catch/re-throw chains.

function makeGraphError({
  status = 400,
  message,
  code,
  error_subcode,
  fbtrace_id,
}: {
  status?: number;
  message: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}) {
  const err: any = new Error(message);
  err.isAxiosError = true;
  err.response = {
    status,
    data: { error: { message, code, error_subcode, fbtrace_id } },
  };
  return err;
}

describe("extractPlatformError", () => {
  test("pulls the platform's message/status/body off an axios error with a response", () => {
    const error = makeGraphError({
      status: 400,
      message: "Error validating access token",
      code: 190,
      error_subcode: 463,
      fbtrace_id: "Aabc123",
    });

    const details = extractPlatformError(error);

    expect(details.message).toBe("Error validating access token");
    expect(details.status).toBe(400);
    expect(details.data).toEqual({
      error: {
        message: "Error validating access token",
        code: 190,
        error_subcode: 463,
        fbtrace_id: "Aabc123",
      },
    });
  });

  test("falls back to error.message when the response body has no nested error.message", () => {
    const error: any = new Error("Request failed with status code 400");
    error.response = { status: 400, data: { notAnError: true } };

    const details = extractPlatformError(error);

    expect(details.message).toBe("Request failed with status code 400");
    expect(details.data).toEqual({ notAnError: true });
  });

  test("falls back to error.message for a network-level error with no response", () => {
    const error = new Error("socket hang up");

    const details = extractPlatformError(error);

    expect(details).toEqual({ message: "socket hang up" });
    expect(details.data).toBeUndefined();
    expect(details.status).toBeUndefined();
  });

  test("falls back to 'Unknown error' when there's no message at all", () => {
    expect(extractPlatformError({}).message).toBe("Unknown error");
    expect(extractPlatformError(null).message).toBe("Unknown error");
  });

  test("unwraps a PlatformApiError instead of trying to read it as an axios error", () => {
    const original = new PlatformApiError("Failed to create carousel item", {
      message: "Invalid parameter",
      status: 400,
      data: { error: { message: "Invalid parameter", code: 100 } },
    });

    const details = extractPlatformError(original);

    expect(details).toEqual({
      message: "Invalid parameter",
      status: 400,
      data: { error: { message: "Invalid parameter", code: 100 } },
    });
  });
});

describe("wrapPlatformError", () => {
  test("prefixes the platform message with context and preserves the structured details", () => {
    const original = makeGraphError({
      status: 400,
      message: "Invalid parameter",
      code: 100,
    });

    const wrapped = wrapPlatformError(original, "Failed to create carousel item 2");

    expect(wrapped).toBeInstanceOf(PlatformApiError);
    expect(wrapped.message).toBe(
      "Failed to create carousel item 2: Invalid parameter",
    );
    expect(wrapped.platformError.data).toEqual({
      error: { message: "Invalid parameter", code: 100 },
    });
  });

  test("re-wrapping an already-wrapped PlatformApiError does not lose the original platform data", () => {
    const original = makeGraphError({
      status: 400,
      message: "Invalid parameter",
      code: 100,
    });
    const firstWrap = wrapPlatformError(original, "attempt 1/30");
    const secondWrap = wrapPlatformError(firstWrap, "attempt 2/30");

    expect(secondWrap.message).toBe("attempt 2/30: Invalid parameter");
    expect(secondWrap.platformError.data).toEqual({
      error: { message: "Invalid parameter", code: 100 },
    });
  });

  test("the resulting platformError is JSON-serializable (guards against the raw-Error-object bug)", () => {
    const original = makeGraphError({
      status: 401,
      message: "Error validating access token",
      code: 190,
      error_subcode: 463,
    });

    const wrapped = wrapPlatformError(original, "Failed to post to Instagram");
    const roundTripped = JSON.parse(JSON.stringify(wrapped.platformError));

    // A raw `Error` object serializes to `{}` because `message` is a
    // non-enumerable own property — this is what silently produced
    // `details: {}`/`null` in social_post_results before the fix.
    expect(roundTripped.data.error.code).toBe(190);
    expect(roundTripped.data.error.error_subcode).toBe(463);
    expect(roundTripped.message).toBe("Error validating access token");
  });
});
