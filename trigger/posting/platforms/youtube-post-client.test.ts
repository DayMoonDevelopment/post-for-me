import { describe, expect, spyOn, test } from "bun:test";
import type { SocialAccount } from "../post.types";
import {
  isRetriableYouTubeSessionInitError,
  sanitizeYouTubeDescription,
  sanitizeYouTubeLocalizations,
  truncateToUtf8Bytes,
  YOUTUBE_MAX_DESCRIPTION_BYTES,
  YouTubePostClient,
} from "./youtube-post-client";

// Isolate module mocks from other platform tests.
const thumbnailHarness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.THUMBNAIL_SCENARIO;
const events = [];
const artifactUrl = "https://media.example.com/thumbnail.jpg";
const thumbnailSet = mock(async (request) => {
  events.push("thumbnail");
  expect(request.media.body).toEqual(Buffer.from("jpeg"));
  expect(request.media.mimeType).toBe("image/jpeg");
  if (scenario === "upload-error") throw new Error("thumbnail upload failed");
  return { data: {} };
});
mock.module("googleapis", () => ({ google: {
  auth: { OAuth2: class {
    setCredentials() {}
    async refreshAccessToken() { return { credentials: { access_token: "token", expiry_date: Date.now() } }; }
    async getAccessToken() { return "token"; }
  } },
  youtube: () => ({ thumbnails: { set: thumbnailSet }, videos: { list: async () => {
    events.push("poll");
    return { data: { items: [{ processingDetails: { processingStatus: "succeeded" } }] } };
  } } }),
} }));
const triggerAndWait = mock(async (id, payload) => {
  events.push("child");
  expect(id).toBe("generate-youtube-timestamp-thumbnail");
  expect(payload).toEqual({ url: "https://example.com/video.mp4", timestampMs: 1250, mediaId: "medium" });
  if (scenario === "throw") throw new Error("child failed");
  return scenario === "child-error" ? { ok: false, error: { message: "failed" } } : { ok: true, output: artifactUrl };
});
mock.module("@trigger.dev/sdk", () => ({
  logger: { info() {}, warn() {}, error() {} },
  tasks: { triggerAndWait }, wait: { for: async () => {} },
}));
globalThis.fetch = mock(async (url, init) => {
  if (init?.method === "HEAD") return new Response(null, { headers: { "content-length": "5", "content-type": "video/mp4" } });
  if (url === "https://example.com/video.mp4") return new Response("video");
  if (String(url).startsWith("https://www.googleapis.com/upload/")) return new Response(null, { headers: { location: "https://upload.example.com" } });
  if (url === "https://upload.example.com") {
    events.push("video");
    return Response.json({ id: "video-id" });
  }
  if (url === artifactUrl || url === "https://example.com/explicit.jpg") {
    events.push("download-thumbnail");
    return new Response("jpeg", { status: scenario === "download-error" ? 404 : 200, headers: { "content-type": "image/jpeg" } });
  }
  throw new Error("Unexpected fetch: " + url);
});
console.log = () => {};
console.error = () => {};
const { YouTubePostClient } = await import("./youtube-post-client.ts");
const client = new YouTubePostClient({ app_id: "test", app_secret: "test" });
const account = { id: "account" };
await client.refreshAccessToken(account);
const result = await client.post({ postId: "post", account, caption: "caption", media: [{
  id: "medium", type: "video", url: "https://example.com/video.mp4",
  ...(scenario !== "none" ? { thumbnail_timestamp_ms: 1250 } : {}),
  ...(scenario === "explicit" ? { thumbnail_url: "https://example.com/explicit.jpg" } : {}),
}] });
expect(result.success).toBe(true);
expect(triggerAndWait).toHaveBeenCalledTimes(["explicit", "none"].includes(scenario) ? 0 : 1);
expect(events).toEqual(scenario === "none" ? ["video", "poll"]
  : scenario === "explicit" ? ["video", "download-thumbnail", "thumbnail", "poll"]
  : ["child-error", "throw"].includes(scenario) ? ["video", "child", "poll"]
  : scenario === "download-error" ? ["video", "child", "download-thumbnail", "poll"]
  : ["video", "child", "download-thumbnail", "thumbnail", "poll"]);
if (["success", "upload-error"].includes(scenario)) {
  const request = result.details.requests.find((entry) => entry.thumbnailUploadRequest).thumbnailUploadRequest;
  expect(request.thumbnailTimestampMs).toBe(1250);
  expect(request).not.toHaveProperty("thumbnailUrl");
}
`;

for (const scenario of ["success", "explicit", "none", "child-error", "throw", "download-error", "upload-error"]) {
  test(`YouTube thumbnail child boundary: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", thumbnailHarness], {
      cwd: __dirname,
      env: { ...process.env, THUMBNAIL_SCENARIO: scenario },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}

describe("YouTube paid promotion metadata", () => {
  test.each([true, false, undefined])(
    "builds upload metadata for has_paid_product_placement=%s",
    async (hasPaidProductPlacement) => {
      const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
        (async (_input, init) =>
          new Response(init?.method === "HEAD" ? null : "video", {
            headers: {
              "content-length": "5",
              "content-type": "video/mp4",
            },
          })) as typeof fetch,
      );
      const errorSpy = spyOn(console, "error").mockImplementation(() => {});

      try {
        const client = new YouTubePostClient({
          app_id: "test",
          app_secret: "test",
        });
        const result = await client.post({
          postId: "test-post",
          account: { id: "test-account" } as SocialAccount,
          caption: "Test video",
          media: [
            {
              id: "paid-promotion-test",
              type: "video",
              url: "https://example.com/video.mp4",
            },
          ],
          platformConfig:
            hasPaidProductPlacement === undefined
              ? undefined
              : { has_paid_product_placement: hasPaidProductPlacement },
        });

        // Stop before uploading: no OAuth client is configured. The request
        // metadata has already been built and recorded by the publishing path.
        expect(result.success).toBe(false);
        const request = result.details.requests.find(
          (entry: { postRequest?: unknown }) => entry.postRequest,
        ).postRequest;
        if (hasPaidProductPlacement === undefined) {
          expect(request.part).toEqual(["snippet", "status"]);
          expect(request.requestBody).not.toHaveProperty(
            "paidProductPlacementDetails",
          );
        } else {
          expect(request.part).toContain("paidProductPlacementDetails");
          expect(request.requestBody.paidProductPlacementDetails).toEqual({
            hasPaidProductPlacement,
          });
        }
        expect(request.requestBody.status).not.toHaveProperty(
          "hasPaidProductPlacement",
        );
      } finally {
        fetchSpy.mockRestore();
        errorSpy.mockRestore();
      }
    },
  );
});

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

describe("sanitizeYouTubeLocalizations", () => {
  test("returns undefined for null or undefined instead of throwing", () => {
    expect(sanitizeYouTubeLocalizations(null)).toBeUndefined();
    expect(sanitizeYouTubeLocalizations(undefined)).toBeUndefined();
  });

  test("does not split an emoji at the 100-character title limit", () => {
    const title = "a".repeat(99) + "😀";
    const result = sanitizeYouTubeLocalizations({ fr: { title } });
    expect(result?.fr.title).toBe(title);

    const longer = sanitizeYouTubeLocalizations({ fr: { title: title + "b" } });
    expect(longer?.fr.title).toBe(title);
  });

  test("caps localized descriptions at 5,000 bytes", () => {
    const result = sanitizeYouTubeLocalizations({
      es: { description: "a".repeat(6000) },
    });
    expect(result?.es.description?.length).toBe(YOUTUBE_MAX_DESCRIPTION_BYTES);
  });
});
