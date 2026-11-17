import { describe, expect, test } from "bun:test";
import { isRetriableYouTubeSessionInitError } from "../../upload-youtube-video";
import {
  sanitizeYouTubeDescription,
  sanitizeYouTubeLocalizations,
  truncateToUtf8Bytes,
  YOUTUBE_MAX_DESCRIPTION_BYTES,
} from "./youtube-post-client";

// Isolate module mocks from other platform tests.
const thumbnailHarness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.THUMBNAIL_SCENARIO;
const events = [];
let inChild = false;
let polls = 0;
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
    constructor(id, secret, redirect) {
      expect([id, secret, redirect]).toEqual(["test", "test", "undefined/api/youtube-auth/callback"]);
    }
    setCredentials(credentials) { this.credentials = credentials; }
    async refreshAccessToken() {
      this.credentials = { access_token: "current-token", refresh_token: "current-refresh", expiry_date: 123456789 };
      return { credentials: this.credentials };
    }
    async getAccessToken() { return "token"; }
  } },
  youtube: () => ({ thumbnails: { set: thumbnailSet }, videos: { list: async () => {
    expect(inChild).toBe(false);
    events.push("poll");
    polls++;
    return { data: { items: [{ processingDetails: { processingStatus: scenario === "processing-failed" ? "failed" : scenario === "processing-timeout" || scenario === "processing-pending" && polls === 1 ? "processing" : "succeeded", processingFailureReason: "transcodeFailed" } }] } };
  } } }),
} }));
const triggerAndWait = mock(async (id, payload) => {
  if (id === "upload-youtube-video") {
    events.push("video-child");
    expect(payload.oauth.credentials).toEqual({ access_token: "current-token", refresh_token: "current-refresh", expiry_date: 123456789 });
    const paid = scenario === "paid-true" ? true : scenario === "paid-false" ? false : undefined;
    if (scenario === "configured") {
      expect(payload.videoRequest.part).toEqual(["snippet", "status", "localizations", "recordingDetails", "paidProductPlacementDetails"]);
      expect(payload.videoRequest.requestBody).toEqual({
        snippet: { title: "A title", description: "x".repeat(5000), tags: ["tag"], categoryId: "22", defaultLanguage: "en" },
        status: { privacyStatus: "private", selfDeclaredMadeForKids: true, containsSyntheticMedia: true, embeddable: false, license: "creativeCommon", publicStatsViewable: false, publishAt: "2030-01-01T00:00:00Z" },
        localizations: { fr: { title: "bonjour", description: "salut" } },
        recordingDetails: { recordingDate: "2020-01-01T00:00:00Z" },
        paidProductPlacementDetails: { hasPaidProductPlacement: true },
      });
    } else if (paid === undefined) {
      expect(payload.videoRequest.part).toEqual(["snippet", "status"]);
      expect(payload.videoRequest.requestBody).not.toHaveProperty("paidProductPlacementDetails");
    } else {
      expect(payload.videoRequest.part).toContain("paidProductPlacementDetails");
      expect(payload.videoRequest.requestBody.paidProductPlacementDetails).toEqual({ hasPaidProductPlacement: paid });
    }
    expect(payload.videoRequest.requestBody.status).not.toHaveProperty("hasPaidProductPlacement");
    if (scenario === "video-framework") return { ok: false, error: { message: "Worker out of memory" } };
    const { uploadYoutubeVideo } = await import("../../upload-youtube-video.ts");
    inChild = true;
    try { return { ok: true, output: JSON.parse(JSON.stringify(await uploadYoutubeVideo.run(JSON.parse(JSON.stringify(payload)), { ctx: { attempt: { number: 2 } } }))) }; }
    finally { inChild = false; }
  }
  if (id === "upload-youtube-thumbnail") {
    events.push("upload-child");
    expect(payload.oauth.credentials).toEqual({ access_token: "current-token", refresh_token: "current-refresh", expiry_date: 123456789 });
    if (scenario === "upload-child-error") return { ok: false };
    if (scenario === "upload-throw") throw new Error("upload child failed");
    const { uploadYoutubeThumbnail } = await import("../../upload-youtube-thumbnail.ts");
    inChild = true;
    try { return { ok: true, output: await uploadYoutubeThumbnail.run(payload, { ctx: { attempt: { number: 2 } } }) }; }
    catch (error) { return { ok: false, error }; }
    finally { inChild = false; }
  }
  events.push("child");
  expect(id).toBe("generate-youtube-timestamp-thumbnail");
  expect(payload).toEqual({ url: "https://example.com/video.mp4", timestampMs: 1250, mediaId: "medium" });
  if (scenario === "throw") throw new Error("child failed");
  return scenario === "child-error" ? { ok: false, error: { message: "failed" } } : { ok: true, output: artifactUrl };
});
mock.module("@trigger.dev/sdk", () => ({
  OutOfMemoryError: class OutOfMemoryError extends Error {},
  task: (definition) => definition,
  logger: { info() {}, warn() {}, error() {} },
  tasks: { triggerAndWait }, wait: { for: async () => {} },
}));
globalThis.fetch = mock(async (url, init) => {
  expect(inChild).toBe(true);
  if (init?.method === "HEAD") return new Response(null, { headers: { "content-length": "5", "content-type": "video/mp4" } });
  if (url === "https://example.com/video.mp4") return new Response("video");
  if (String(url).startsWith("https://www.googleapis.com/upload/")) return scenario === "video-error" ? new Response("denied", { status: 403 }) : new Response(null, { headers: { location: "https://upload.example.com" } });
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
console.warn = () => {};
const { YouTubePostClient } = await import("./youtube-post-client.ts");
const client = new YouTubePostClient({ app_id: "test", app_secret: "test" });
const account = { id: "account" };
await client.refreshAccessToken(account);
const result = JSON.parse(JSON.stringify(await client.post({ postId: "post", account, caption: "caption", media: [{
  id: "medium", type: "video", url: "https://example.com/video.mp4",
  ...(!["none", "paid-true", "paid-false"].includes(scenario) ? { thumbnail_timestamp_ms: 1250 } : {}),
  ...(scenario === "explicit" ? { thumbnail_url: "https://example.com/explicit.jpg" } : {}),
}], platformConfig: scenario === "configured" ? {
  title: " <A>\ntitle ", description: "x".repeat(5001), tags: ["tag"], category_id: "22", default_language: "en",
  privacy_status: "private", made_for_kids: true, contains_synthetic_media: true, embeddable: false, license: "creativeCommon", public_stats_viewable: false, publish_at: "2030-01-01T00:00:00Z",
  localizations: { fr: { title: "<bonjour>", description: "<salut>" } }, recording_date: "2020-01-01T00:00:00Z", has_paid_product_placement: true,
} : scenario.startsWith("paid-") ? { has_paid_product_placement: scenario === "paid-true" } : undefined })));
if (["video-error", "video-framework"].includes(scenario)) {
  expect(result.success).toBe(false);
  expect(events).toEqual(["video-child"]);
  expect(result.error_message).toContain(scenario === "video-error" ? "403" : "Worker out of memory");
  if (scenario === "video-error") {
    expect(result.details.requests.some((r) => r.postRequest)).toBe(true);
    expect(result.details.responses.some((r) => r.mediaStagedForYoutube)).toBe(true);
    expect(result.details.error.message).toContain("denied");
  }
  process.exit(0);
}
expect(result.success).toBe(scenario !== "processing-failed");
if (scenario === "processing-failed") expect(result.error_message).toContain("transcodeFailed");
if (scenario === "processing-timeout") {
  expect(polls).toBe(20);
  expect(result.details.message).toBe("Video is still processing, check YouTube for the status");
}
if (scenario === "configured") expect(result.details.warning).toContain("truncated to 5000 bytes");
expect(result.details.requests.some((r) => r.postRequest?.upload.chunkSizeBytes === 8 * 1024 * 1024)).toBe(true);
const noThumbnail = ["none", "paid-true", "paid-false"].includes(scenario);
expect(triggerAndWait).toHaveBeenCalledTimes(noThumbnail ? 1 : ["explicit", "child-error", "throw"].includes(scenario) ? 2 : 3);
expect(events.shift()).toBe("video-child");
if (["processing-pending", "processing-timeout"].includes(scenario)) {
  expect(events.slice(-polls)).toEqual(Array(polls).fill("poll"));
  events.splice(events.length - polls + 1);
}
expect(events).toEqual(noThumbnail ? ["video", "poll"]
  : scenario === "explicit" ? ["video", "upload-child", "download-thumbnail", "thumbnail", "poll"]
  : ["child-error", "throw"].includes(scenario) ? ["video", "child", "poll"]
  : ["upload-child-error", "upload-throw"].includes(scenario) ? ["video", "child", "upload-child", "poll"]
  : scenario === "download-error" ? ["video", "child", "upload-child", "download-thumbnail", "poll"]
  : ["video", "child", "upload-child", "download-thumbnail", "thumbnail", "poll"]);
if (["success", "upload-error"].includes(scenario)) {
  const request = result.details.requests.find((entry) => entry.thumbnailUploadRequest).thumbnailUploadRequest;
  expect(request.thumbnailTimestampMs).toBe(1250);
  expect(request).not.toHaveProperty("thumbnailUrl");
}
if (scenario === "upload-error") expect(result.details.responses.some((entry) => entry.thumbnailError?.error === "thumbnail upload failed")).toBe(true);
`;

for (const scenario of ["success", "explicit", "none", "child-error", "throw", "download-error", "upload-error", "upload-child-error", "upload-throw", "paid-true", "paid-false", "video-error", "video-framework", "configured", "processing-failed", "processing-pending", "processing-timeout"]) {
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
