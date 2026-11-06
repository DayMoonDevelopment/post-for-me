import { expect, test } from "bun:test";

// Isolate task registration, environment, and TUS mocks from other task tests.
const harness = String.raw`
import { expect, mock } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

const scenario = process.env.COPY_MEDIA_SCENARIO;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "copy-media-test-"));
const source = "https://media.example.com/source.wrong?download=1";
const secret = "private-service-role-key";
process.env.SUPABASE_URL = "https://project.supabase.co///";
process.env.SUPABASE_SERVICE_ROLE_KEY = secret;
delete process.env.SUPABASE_MEDIA_PUBLIC_BASE_URL;
if (scenario === "missing-url") delete process.env.SUPABASE_URL;
if (scenario === "missing-key") delete process.env.SUPABASE_SERVICE_ROLE_KEY;
if (scenario === "blank-config") process.env.SUPABASE_URL = "   ";
if (scenario === "override") process.env.SUPABASE_MEDIA_PUBLIC_BASE_URL = "https://cdn.example.com/custom/media///";
mock.module("@trigger.dev/sdk", () => ({ task: (definition) => definition }));
mock.module("node:os", () => ({ default: { tmpdir: () => tempDir } }));

const large = scenario === "large";
const totalSize = large ? 40 * 1024 * 1024 + 123 : 123;
let produced = 0;
let cancelled = false;
let streamFailed = false;
let input;
let uploadedBytes = 0;
let uploadOptions;
let uploadCount = 0;
// Bun 1.3.3's fromWeb hangs on errored web streams. Keep the real pipeline and
// disk writes for this case, replacing only the web-to-Node adapter.
if (scenario === "download-error") {
  mock.module("node:stream", () => ({
    Readable: class extends Readable {
      static fromWeb(body) {
        body.cancel();
        return Readable.from((async function* () {
          yield Buffer.from("partial download");
          await new Promise((resolve) => setTimeout(resolve, 10));
          streamFailed = true;
          throw new Error("download stream failed");
        })());
      }
    },
  }));
}
const contentType = scenario === "image" ? "Image/JPEG; charset=binary"
  : scenario === "pdf" ? "application/pdf"
  : scenario === "unknown" ? "application/octet-stream"
  : scenario === "missing-mime" ? "" : "Video/MP4; charset=binary";
const download = mock(async (url, options) => {
  expect(url).toBe(source);
  expect(options?.headers).toBeUndefined();
  const body = new ReadableStream({
    pull(controller) {
      if (produced === totalSize) {
        controller.close();
      } else {
        const length = Math.min(64 * 1024, totalSize - produced);
        produced += length;
        controller.enqueue(new Uint8Array(length).fill(7));
      }
    },
    cancel() { cancelled = true; },
  });
  return {
    ok: scenario !== "http-error", status: 503,
    headers: new Headers({ "content-type": contentType, "content-length": "1" }),
    body: scenario === "missing-body" ? null : body,
    arrayBuffer() { throw new Error("Must not buffer download"); },
    blob() { throw new Error("Must not buffer download"); },
  };
});
globalThis.fetch = download;
mock.module("tus-js-client", () => ({
  Upload: class {
    constructor(stream, options) {
      input = stream;
      uploadOptions = options;
      uploadCount++;
      expect(stream).toBeInstanceOf(Readable);
      if (scenario === "constructor-error") throw new Error("TUS constructor failed: " + secret);
    }
    start() {
      if (scenario === "start-error") throw new Error("TUS start failed: " + secret);
      if (scenario === "upload-error") {
        uploadOptions.onError(new Error("authorization: Bearer " + secret));
        return;
      }
      (async () => {
        expect((await fs.stat(input.path)).size).toBe(totalSize);
        for await (const chunk of input) {
          expect(chunk.length).toBeLessThanOrEqual(64 * 1024);
          expect(chunk[0]).toBe(7);
          uploadedBytes += chunk.length;
        }
        uploadOptions.onSuccess();
      })().catch(uploadOptions.onError);
    }
  },
}));

try {
  const { copyMediaToSupabase: task } = await import("./copy-media-to-supabase.ts");
  expect(task.id).toBe("copy-media-to-supabase");
  expect(task.machine).toBe("medium-1x");
  expect(task.maxDuration).toBe(800);
  expect(task.retry.maxAttempts).toBe(2);
  expect(task.retry.outOfMemory.machine).toBe("large-1x");
  const failures = {
    "missing-url": "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    "missing-key": "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    "blank-config": "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    "http-error": "HTTP 503",
    "missing-body": "No response body",
    "pdf": "Only image and video",
    "unknown": "Only image and video",
    "missing-mime": "Only image and video",
    "download-error": "download stream failed",
    "upload-error": "Failed to upload media to Supabase",
    "constructor-error": "Failed to upload media to Supabase",
    "start-error": "Failed to upload media to Supabase",
  };
  if (failures[scenario]) {
    let error;
    try { await task.run({ url: source }); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(failures[scenario]);
    expect(error.message).not.toContain(secret);
  } else {
    const result = await task.run({ url: source });
    const base = scenario === "override" ? "https://cdn.example.com/custom/media"
      : "https://project.supabase.co/storage/v1/object/public/post-media";
    expect(result).toBe(base + "/" + encodeURIComponent(uploadOptions.metadata.objectName));
    expect(uploadedBytes).toBe(totalSize);
  }

  const missingConfig = ["missing-url", "missing-key", "blank-config"].includes(scenario);
  expect(download).toHaveBeenCalledTimes(missingConfig ? 0 : 1);
  const noUpload = missingConfig || ["http-error", "missing-body", "pdf", "unknown", "missing-mime", "download-error"].includes(scenario);
  expect(uploadCount).toBe(noUpload ? 0 : 1);
  if (!noUpload) {
    expect(input.destroyed).toBe(true);
    expect(input.closed).toBe(true);
    const extension = scenario === "image" ? "jpg" : "mp4";
    expect(uploadOptions.metadata).toEqual({
      bucketName: "post-media", objectName: path.basename(input.path),
      contentType: scenario === "image" ? "image/jpeg" : "video/mp4", cacheControl: "3600",
    });
    expect(uploadOptions.metadata.objectName).toMatch(new RegExp("^tiktok_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\." + extension + "$"));
    expect(input.path).toBe(path.join(tempDir, uploadOptions.metadata.objectName));
    expect(uploadOptions.endpoint).toBe("https://project.supabase.co/storage/v1/upload/resumable");
    expect(uploadOptions.headers.authorization).toBe("Bearer " + secret);
    expect(uploadOptions.uploadSize).toBe(totalSize);
    expect(uploadOptions.chunkSize).toBe(6 * 1024 * 1024);
    expect(uploadOptions.retryDelays).toEqual([0, 3000, 5000, 10000, 20000]);
    expect(uploadOptions.uploadDataDuringCreation).toBe(true);
    expect(uploadOptions.removeFingerprintOnSuccess).toBe(true);
  }
  expect(streamFailed).toBe(scenario === "download-error");
  if (["http-error", "pdf", "unknown", "missing-mime"].includes(scenario)) expect(cancelled).toBe(true);
  expect(await fs.readdir(tempDir)).toEqual([]);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
`;

for (const scenario of [
  "video", "image", "override", "large", "download-error", "upload-error",
  "constructor-error", "start-error", "http-error", "missing-body", "pdf",
  "unknown", "missing-mime", "missing-url", "missing-key", "blank-config",
]) {
  test(`copy media to Supabase: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname,
      env: { ...process.env, COPY_MEDIA_SCENARIO: scenario },
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
