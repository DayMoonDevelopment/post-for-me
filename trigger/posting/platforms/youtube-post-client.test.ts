import { describe, expect, test } from "bun:test";
import { isRetriableYouTubeSessionInitError } from "./youtube-post-client";

describe("isRetriableYouTubeSessionInitError", () => {
  test("retries on 429", () => {
    expect(isRetriableYouTubeSessionInitError(429, "")).toBe(true);
  });

  test.each([500, 502, 503, 599])("retries on %i", (status) => {
    expect(isRetriableYouTubeSessionInitError(status, "")).toBe(true);
  });

  test("retries on 409 with reason alreadyExists", () => {
    const body = JSON.stringify({
      error: {
        code: 409,
        message: "Requested entity already exists",
        errors: [
          {
            message: "Requested entity already exists",
            domain: "global",
            reason: "alreadyExists",
          },
        ],
        status: "ALREADY_EXISTS",
      },
    });
    expect(isRetriableYouTubeSessionInitError(409, body)).toBe(true);
  });

  test("does not retry on 409 with a different reason", () => {
    const body = JSON.stringify({
      error: {
        code: 409,
        errors: [{ reason: "conflict" }],
      },
    });
    expect(isRetriableYouTubeSessionInitError(409, body)).toBe(false);
  });

  test("does not retry on 409 with malformed body", () => {
    expect(isRetriableYouTubeSessionInitError(409, "not json")).toBe(false);
  });

  test("does not retry on unrelated 4xx errors", () => {
    expect(isRetriableYouTubeSessionInitError(403, "")).toBe(false);
    expect(isRetriableYouTubeSessionInitError(400, "")).toBe(false);
  });
});
