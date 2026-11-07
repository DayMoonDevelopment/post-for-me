import { expect, test } from "bun:test";

// Keep task registration and storage mocks out of other tests' module caches.
const harness = String.raw`
import { expect, mock } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

const scenario = process.env.MEDIUM_SCENARIO;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "medium-storage-test-"));
const sourceUrl = "https://external.example.com/download?id=123";
const thumbnailUrl = "https://external.example.com/thumbnail?id=456";
const mainUrl = "https://media.example.com/uploads/main";
const uploadedThumbnailUrl = "https://media.example.com/uploads/thumbnail";
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const uploads = [];
const requests = [];
const errors = [];
let streamFailed = false;
const isThumbnailFailure = scenario.startsWith("thumbnail-");
const withThumbnail = scenario === "image-thumbnail" || isThumbnailFailure;
const mime = scenario === "pdf" ? "application/pdf; charset=binary"
  : scenario === "video" ? "video/MP4; charset=binary"
  : "image/PNG; charset=binary";
const extension = scenario === "pdf" || scenario === "range-pdf" ? ".pdf"
  : scenario === "video" ? ".mp4" : ".png";
const mediaType = extension === ".pdf" ? "document" : extension === ".mp4" ? "video" : "image";
const mainBody = Buffer.from("downloaded main media bytes");
const thumbnailBody = Buffer.from("downloaded thumbnail bytes");

mock.module("@trigger.dev/sdk", () => ({
  logger: { info() {}, log() {}, error(...args) { errors.push(args); } },
  task: (definition) => definition,
}));
mock.module("os", () => ({ default: { tmpdir: () => tempDir } }));
const enqueueMediaServerJob = mock(async () => {});
mock.module("./media-server", () => ({ enqueueMediaServerJob }));
const download = mock(async (url, options) => {
  requests.push({ url, options });
  const thumbnail = url === thumbnailUrl;
  const contentType = thumbnail ? "image/JPEG; charset=binary" : mime;
  if (options?.method === "HEAD") {
    return {
      ok: scenario !== "head-error",
      statusText: "HEAD unavailable",
      headers: new Headers({ "content-type": scenario === "range-pdf" || scenario === "unsupported"
        ? "application/octet-stream" : contentType }),
    };
  }
  if (options?.headers?.Range) {
    const bytes = scenario === "range-pdf" ? Buffer.from("%PDF-1.7 document bytes")
      : scenario === "unsupported" ? Buffer.alloc(16) : Buffer.from([137, 80, 78, 71, 0, 0, 0, 0, 0, 0, 0, 0]);
    return { ok: true, status: 206, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
  }
  const failingDownload = scenario === "download-error" || (thumbnail && scenario === "thumbnail-download-error");
  const body = failingDownload ? Readable.from((async function* () {
    yield Buffer.from("partial download");
    // Allow the destination to write partial data before the source fails.
    await new Promise((resolve) => setTimeout(resolve, 10));
    streamFailed = true;
    throw new Error("download stream failed");
  })()) : Readable.from([thumbnail ? thumbnailBody : mainBody]);
  return {
    ok: scenario !== "http-error",
    statusText: "Not Found",
    headers: new Headers(),
    body: scenario === "missing-body" ? null : body,
  };
});
// Load Bun's node-fetch implementation before replacing its cached exports.
await import("node-fetch");
mock.module("node-fetch", () => ({ default: download }));
expect((await import("node-fetch")).default).toBe(download);

const uploadMedia = mock(async (upload) => {
  uploads.push({ ...upload, bytes: await fs.readFile(upload.filePath) });
  if (scenario === "upload-error" || (upload.key.startsWith("thumbnail_") && scenario === "thumbnail-upload-error")) {
    throw new Error("R2 upload failed");
  }
  return upload.key.startsWith("thumbnail_") ? uploadedThumbnailUrl : mainUrl;
});
mock.module("./media-storage", () => ({ uploadMedia }));

try {
  const { processPostMedium } = await import("./process-post-medium.ts");
  expect(processPostMedium.id).toBe("process-post-medium");
  const medium = {
    id: "medium-123", url: sourceUrl, position: 2,
    provider: "instagram", provider_connection_id: "connection-123",
    thumbnail_timestamp_ms: 1500, alt_text: "Media description",
    tags: [{ username: "example", x: 0.25, y: 0.75 }], skip_processing: true,
    ...(withThumbnail ? { thumbnail_url: thumbnailUrl } : {}),
  };
  const failures = {
    "upload-error": "R2 upload failed",
    "download-error": "download stream failed",
    "http-error": "Failed to download file: Not Found",
    "missing-body": "No response body available for streaming",
    "unsupported": "File type not supported",
  };
  if (failures[scenario]) {
    await expect(processPostMedium.run({ medium })).rejects.toThrow(failures[scenario]);
    expect(errors.length).toBeGreaterThan(0);
  } else {
    expect(await processPostMedium.run({ medium })).toEqual({
      ...medium,
      url: mainUrl,
      thumbnail_url: isThumbnailFailure ? thumbnailUrl : withThumbnail ? uploadedThumbnailUrl : "",
      type: mediaType,
    });
    expect(errors.length).toBe(isThumbnailFailure ? 1 : 0);
  }

  const noUpload = ["download-error", "http-error", "missing-body", "unsupported"].includes(scenario);
  expect(uploadMedia).toHaveBeenCalledTimes(noUpload ? 0 : withThumbnail && scenario !== "thumbnail-download-error" ? 2 : 1);
  for (const [index, upload] of uploads.entries()) {
    const thumbnail = index === 1;
    expect(Object.keys(upload).sort()).toEqual(["bytes", "contentType", "filePath", "key"]);
    expect(upload.key).toMatch(new RegExp("^" + (thumbnail ? "thumbnail_" : "media_") + uuid + (thumbnail ? "\\.jpg" : "\\" + extension) + "$"));
    expect(upload.filePath).toBe(path.join(tempDir, upload.key));
    expect(upload.contentType).toBe(thumbnail ? "image/jpeg" : mediaType === "document" ? "application/pdf" : mediaType === "video" ? "video/mp4" : "image/png");
    expect(upload.bytes).toEqual(thumbnail ? thumbnailBody : mainBody);
  }
  expect(streamFailed).toBe(scenario === "download-error" || scenario === "thumbnail-download-error");
  expect(requests.filter(({ options }) => options?.headers?.Range).length)
    .toBe(["range-pdf", "head-error", "unsupported"].includes(scenario) ? 1 : 0);
  expect(requests.filter(({ url }) => url === thumbnailUrl).length).toBe(withThumbnail ? 2 : 0);
  expect(await fs.readdir(tempDir)).toEqual([]);
  expect(enqueueMediaServerJob.mock.calls).toEqual([
    ["process-post-medium", { task: "media.localize", url: sourceUrl }],
    ...(withThumbnail ? [["process-post-medium", { task: "media.localize", url: thumbnailUrl }]] : []),
  ]);

  // Both original URLs must enqueue even when the main localization fails first.
  enqueueMediaServerJob.mockClear();
  uploadMedia.mockImplementation(async () => { throw new Error("main localization failed"); });
  await expect(processPostMedium.run({ medium: { ...medium, thumbnail_url: thumbnailUrl } })).rejects.toThrow();
  expect(enqueueMediaServerJob.mock.calls).toEqual([
    ["process-post-medium", { task: "media.localize", url: sourceUrl }],
    ["process-post-medium", { task: "media.localize", url: thumbnailUrl }],
  ]);

  // Missing URLs are skipped independently, not replaced with uploaded URLs.
  for (const absent of [undefined, null, ""]) {
    enqueueMediaServerJob.mockClear();
    await expect(processPostMedium.run({ medium: { ...medium, url: absent, thumbnail_url: thumbnailUrl } })).rejects.toThrow("No media URL provided");
    expect(enqueueMediaServerJob.mock.calls).toEqual([
      ["process-post-medium", { task: "media.localize", url: thumbnailUrl }],
    ]);
    enqueueMediaServerJob.mockClear();
    await expect(processPostMedium.run({ medium: { ...medium, url: absent, thumbnail_url: absent } })).rejects.toThrow("No media URL provided");
    expect(enqueueMediaServerJob).not.toHaveBeenCalled();
  }
  expect(await fs.readdir(tempDir)).toEqual([]);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
`;

for (const scenario of [
  "image-thumbnail",
  "image",
  "pdf",
  "video",
  "range-pdf",
  "head-error",
  "upload-error",
  "download-error",
  "http-error",
  "missing-body",
  "unsupported",
  "thumbnail-upload-error",
  "thumbnail-download-error",
]) {
  test(`process medium storage: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname,
      env: { ...process.env, MEDIA_SERVER_REDIS_URL: "redis://127.0.0.1:1", MEDIUM_SCENARIO: scenario },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
  });
}
