import { describe, expect, test } from "bun:test";
import {
  isRetriableYouTubeSessionInitError,
  sanitizeYouTubeDescription,
  truncateToUtf8Bytes,
  YOUTUBE_MAX_DESCRIPTION_BYTES,
} from "./youtube-post-client";

describe("isRetriableYouTubeSessionInitError", () => {
  test("retries on 429", () => {
    expect(isRetriableYouTubeSessionInitError(429, "")).toBe(true);
  });

  test.each([500, 502, 503, 599])("retries on %i", (status: number) => {
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

describe("sanitizeYouTubeDescription", () => {
  test("keeps a 3,000-character description in full", () => {
    const description = "a".repeat(3000);
    const result = sanitizeYouTubeDescription(description);
    expect(result.value).toBe(description);
    expect(result.truncated).toBe(false);
  });

  test("keeps exactly 5,000 bytes and truncates 5,001", () => {
    const atLimit = sanitizeYouTubeDescription("a".repeat(5000));
    expect(atLimit.value?.length).toBe(5000);
    expect(atLimit.truncated).toBe(false);

    const overLimit = sanitizeYouTubeDescription("a".repeat(5001));
    expect(overLimit.value?.length).toBe(5000);
    expect(overLimit.truncated).toBe(true);
    expect(overLimit.originalBytes).toBe(5001);
  });

  test("caps multi-byte text by bytes, not characters", () => {
    // "あ" is 3 bytes in UTF-8, so at most 1,666 fit in 5,000 bytes
    const result = sanitizeYouTubeDescription("あ".repeat(2000));
    expect(result.truncated).toBe(true);
    expect(result.value).toBe("あ".repeat(1666));
    expect(Buffer.byteLength(result.value!, "utf8")).toBeLessThanOrEqual(
      YOUTUBE_MAX_DESCRIPTION_BYTES,
    );
  });

  test("strips angle brackets and trims", () => {
    expect(sanitizeYouTubeDescription("  <b>hi</b>\nthere  ").value).toBe(
      "bhi/b\nthere",
    );
  });

  test("returns null when empty after sanitizing", () => {
    expect(sanitizeYouTubeDescription(" <> ").value).toBeNull();
  });
});

describe("truncateToUtf8Bytes", () => {
  test("never splits an emoji surrogate pair", () => {
    // "😀" is 4 bytes; with only 3 bytes of room it must be dropped entirely
    expect(truncateToUtf8Bytes("ab😀", 5)).toBe("ab");
    expect(truncateToUtf8Bytes("ab😀", 6)).toBe("ab😀");
  });

  test("returns short text unchanged", () => {
    expect(truncateToUtf8Bytes("hello", 5000)).toBe("hello");
  });
});
