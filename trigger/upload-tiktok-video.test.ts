import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock } from "bun:test";
import { stat, truncate } from "fs/promises";
import axios from "axios";
const { OutOfMemoryError } = await import("@trigger.dev/sdk");
const scenario = process.env.SCENARIO;
const attempt = Number(process.env.ATTEMPT);
const draft = process.env.DRAFT === "true";
const status = process.env.STATUS || "PUBLISH_COMPLETE";
const delays = [];
let inChild = false;
let filePath;
const events = [];
const size = scenario === "empty" ? 0 : scenario === "too-many" ? 64 * 1024 * 1024 * 1000 + 1
  : scenario === "multi" || scenario === "multi-upload-failure" ? 128 * 1024 * 1024 + 1 : scenario === "64mb" ? 64 * 1024 * 1024
  : scenario === "5mb" ? 5 * 1024 * 1024 : 4;
const mime = scenario === "quicktime" ? " Video/QuickTime; codecs=test " : scenario === "webm" ? "video/webm" : "application/octet-stream";
const fetchMock = mock(async url => {
  expect(inChild).toBe(true);
  expect(url).toBe("https://source.example/video");
  events.push("download");
  if (scenario === "download-failure") return new Response("no", { status: 403 });
  return new Response(size === 0 ? "" : "data", { headers: { "content-type": mime } });
});
globalThis.fetch = fetchMock;
const apiError = Object.assign(new Error("TikTok rejected request"), {
  response: { data: { error: { code: "reached_active_user_cap", message: "cap reached" } }, status: 429, headers: { "x-log-id": "trace" } },
  request: { method: "POST", path: "/video/init/", headers: { "x-test": "value" } },
});
apiError.request.self = apiError.request;
const posts = [];
axios.post = mock(async (url, body, config) => {
  posts.push({ url, body });
  if (url.includes("creator_info")) {
    expect(inChild).toBe(false);
    return { data: { data: { creator_username: "tester", privacy_level_options: ["SELF_ONLY"] } } };
  }
  if (url.includes("/status/")) {
    expect(inChild).toBe(false);
    expect(body).toEqual({ publish_id: "publish-id" });
    return { data: JSON.stringify({ data: { status, fail_reason: "invalid_media", publicaly_available_post_id: ["1234567890123456789"] } }) };
  }
  expect(inChild).toBe(true);
  events.push("init");
  expect(url).toBe("https://open.tiktokapis.com/v2/post/publish/" + (draft ? "inbox/" : "") + "video/init/");
  expect(config.headers.Authorization).toBe("Bearer token");
  const chunkSize = size > 64 * 1024 * 1024 ? Math.floor(size / Math.ceil(size / (64 * 1024 * 1024))) : size;
  expect(body.source_info).toEqual({ source: "FILE_UPLOAD", video_size: size, chunk_size: chunkSize, total_chunk_count: Math.floor(size / chunkSize) });
  expect(body.post_info).toEqual(draft ? { title: "caption", video_cover_timestamp_ms: 125, is_aigc: true } : {
    title: "caption", video_cover_timestamp_ms: 125, privacy_level: "SELF_ONLY", disable_duet: true,
    disable_comment: false, disable_stitch: true, brand_content_toggle: true, brand_organic_toggle: true, is_aigc: true,
  });
  if (scenario === "init-failure") throw apiError;
  return { data: { data: { publish_id: "publish-id", ...(scenario === "missing-url" ? {} : { upload_url: "https://upload.example/video" }) } } };
});
const chunks = [];
axios.put = mock(async (url, stream, config) => {
  expect(inChild).toBe(true);
  expect(url).toBe("https://upload.example/video");
  events.push("upload");
  chunks.push(config.headers);
  expect(config.maxBodyLength).toBe(Infinity);
  expect(config.maxContentLength).toBe(Infinity);
  let length = 0;
  for await (const chunk of stream) length += chunk.length;
  expect(length).toBe(config.headers["Content-Length"]);
  if (scenario === "upload-failure" || (scenario === "multi-upload-failure" && chunks.length === 2)) throw apiError;
  return { status: 206 };
});
let childTask;
let childRuns = 0;
const childErrors = [];
const dispatch = mock(async (id, payload) => {
  expect(id).toBe("upload-tiktok-video");
  expect(inChild).toBe(false);
  inChild = true;
  try {
    // Simulate SDK retry on a thrown first-attempt error, never on a failure envelope.
    for (let number = attempt; number <= 2; number++) {
      childRuns++;
      try {
        return { ok: true, output: JSON.parse(JSON.stringify(await childTask.run(JSON.parse(JSON.stringify(payload)), { ctx: { attempt: { number } } }))) };
      } catch (error) {
        childErrors.push(error);
        if (number === 2) throw error;
      }
    }
  } finally { inChild = false; }
});
mock.module("@trigger.dev/sdk", () => ({ OutOfMemoryError, task: definition => definition, tasks: { triggerAndWait: dispatch }, wait: { for: async duration => { delays.push(duration); } } }));
const { uploadTikTokVideo, TikTokVideoUploader } = await import("./upload-tiktok-video.ts");
childTask = uploadTikTokVideo;
expect(childTask.id).toBe("upload-tiktok-video");
expect(childTask.machine).toBe("medium-1x");
expect(childTask.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
const { PostClient } = await import("./posting/post-client.ts");
const download = PostClient.prototype.downloadToTempFile;
TikTokVideoUploader.prototype.downloadToTempFile = async function(...args) {
  expect(args).toEqual(["https://source.example/video", { prefix: "tiktok" }]);
  const result = await download.apply(this, args);
  filePath = result.filePath;
  if (size > 4 && scenario !== "too-many") await truncate(filePath, size);
  return { ...result, size };
};
if (scenario === "cleanup-failure") {
  const unlink = PostClient.prototype.unlinkQuiet;
  TikTokVideoUploader.prototype.unlinkQuiet = async function(path) {
    await unlink.call(this, path);
    throw new Error("cleanup failed after accepted upload");
  };
}
const { TikTokPostClient } = await import("./posting/platforms/tiktok-post-client.ts");
const client = new TikTokPostClient({ app_id: "app", app_secret: "secret" });
client.downloadToTempFile = () => { throw new Error("Parent must not download"); };
console.error = () => {};
const result = await client.post({
  postId: "post", account: { id: "account", access_token: "token" }, caption: "caption",
  media: [{ type: "video", url: "https://source.example/video", thumbnail_timestamp_ms: 125 }],
  platformConfig: { is_draft: draft, allow_duet: false, allow_comment: true, allow_stitch: false,
    disclose_branded_content: true, disclose_your_brand: true, is_ai_generated: true, privacy_status: "public" },
});
if (filePath) expect(await stat(filePath).catch(() => null)).toBeNull();
expect(dispatch).toHaveBeenCalledTimes(1);
expect(childRuns).toBe(1);
expect(childErrors).toEqual([]);
expect(fetchMock).toHaveBeenCalledTimes(1);
expect(events.filter(event => event === "init").length).toBeLessThanOrEqual(1);
let message;
if (scenario === "empty") message = "Invalid TikTok video size: 0";
if (scenario === "too-many") message = "TikTok upload requires too many chunks (1001). Max is 1000.";
if (scenario === "missing-url") message = "TikTok did not return an upload_url for FILE_UPLOAD source";
if (scenario === "download-failure") message = "Failed to download media: 403 ";
if (scenario === "cleanup-failure") message = "cleanup failed after accepted upload";
if (scenario === "init-failure" || scenario === "upload-failure" || scenario === "multi-upload-failure") message = apiError.message;
if (message) {
  expect(result.success).toBe(false);
  expect(result.details.error.message).toBe(message);
  expect(posts.some(p => p.url.includes("/status/"))).toBe(false);
  if (["init-failure", "upload-failure", "multi-upload-failure"].includes(scenario)) {
    expect(result.error_message).toContain("daily cap");
    expect(result.details.error.response).toEqual(apiError.response);
    expect(result.details.error.request).toEqual({ method: "POST", url: "/video/init/", headers: { "x-test": "value" } });
  } else expect(result.error_message).toBe("Failed to post to TikTok");
} else {
  const processing = status.startsWith("PROCESSING");
  expect(result.success).toBe(!processing && status !== "FAILED" && status !== "UNKNOWN" && (draft || status !== "SEND_TO_USER_INBOX"));
  expect(posts.filter(p => p.url.includes("/status/"))).toHaveLength(processing ? 15 : 1);
  expect(delays).toHaveLength(processing ? 14 : 0);
  if (processing) {
    expect(result.details.status).toBe("Processing");
    expect(result.error_message).toContain("still processing");
    expect(delays[0]).toEqual({ seconds: 5 });
    expect(delays[1]).toEqual({ seconds: 7.5 });
  } else if (!result.success) {
    expect(result.details.status).toBe(status);
    expect(result.details.fail_reason).toBe("invalid_media");
  }
  expect(result.provider_post_id).toBe(draft && status !== "FAILED" && status !== "UNKNOWN" ? "publish-id" : "1234567890123456789");
  const chunkSize = size > 64 * 1024 * 1024 ? Math.floor(size / 3) : size;
  const count = Math.floor(size / chunkSize);
  expect(chunks).toHaveLength(count);
  for (let i = 0; i < count; i++) {
    const start = i * chunkSize;
    const end = i === count - 1 ? size - 1 : start + chunkSize - 1;
    expect(chunks[i]).toEqual({ "Content-Type": scenario === "quicktime" ? "video/quicktime" : scenario === "webm" ? "video/webm" : "video/mp4",
      "Content-Length": end - start + 1, "Content-Range": "bytes " + start + "-" + end + "/" + size });
  }
}
expect(result.details.requests.filter(r => r.publishIdRequest)).toHaveLength(events.includes("init") ? 1 : 0);
expect(result.details.requests.filter(r => r.videoUploadRequest)).toHaveLength(chunks.length);
expect(result.details.responses.filter(r => r.videoUploadResponse)).toHaveLength(scenario === "upload-failure" || scenario === "multi-upload-failure" ? chunks.length - 1 : chunks.length);
expect(result.details.responses.filter(r => r.publishIdResponse)).toHaveLength(events.includes("init") && scenario !== "init-failure" ? 1 : 0);
for (const entry of [...result.details.requests, ...result.details.responses]) expect(typeof entry.timestamp).toBe("string");
`;

for (const scenario of ["small", "5mb", "64mb", "multi", "quicktime", "webm", "empty", "too-many", "missing-url", "download-failure", "init-failure", "upload-failure", "multi-upload-failure"]) {
  for (const draft of [false, true]) {
    test(`TikTok video child boundary: ${scenario}, draft=${draft}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, SCENARIO: scenario, ATTEMPT: "2", DRAFT: String(draft) },
        stdout: "pipe", stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });
  }
}

for (const scenario of ["empty", "too-many", "missing-url", "download-failure", "init-failure", "upload-failure", "multi-upload-failure", "cleanup-failure"]) {
  for (const draft of [false, true]) {
    test(`TikTok video first-attempt ${scenario} returns diagnostics without replay, draft=${draft}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, SCENARIO: scenario, ATTEMPT: "1", DRAFT: String(draft) },
        stdout: "pipe", stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });
  }
}

test("TikTok video explicit SDK OOM is rethrown for machine fallback", async () => {
  const child = Bun.spawn([process.execPath, "--eval", String.raw`
    import { expect, mock } from "bun:test";
    const { OutOfMemoryError } = await import("@trigger.dev/sdk");
    mock.module("@trigger.dev/sdk", () => ({ OutOfMemoryError, task: definition => definition }));
    const { uploadTikTokVideo, TikTokVideoUploader } = await import("./upload-tiktok-video.ts");
    const error = new OutOfMemoryError();
    TikTokVideoUploader.prototype.upload = async () => { throw error; };
    for (const number of [1, 2]) {
      let caught;
      try { await uploadTikTokVideo.run({}, { ctx: { attempt: { number } } }); }
      catch (error) { caught = error; }
      expect(caught).toBe(error);
    }
    expect(uploadTikTokVideo.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
  `], { cwd: __dirname, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
});

for (const status of ["PROCESSING", "PROCESSING_DOWNLOAD", "PROCESSING_UPLOAD", "PUBLISH_SUCCESS", "SEND_TO_USER_INBOX", "FAILED", "UNKNOWN"]) {
  for (const draft of [false, true]) {
    test(`TikTok video parent polling: ${status}, draft=${draft}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, SCENARIO: "small", ATTEMPT: "2", DRAFT: String(draft), STATUS: status },
        stdout: "pipe", stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });
  }
}
