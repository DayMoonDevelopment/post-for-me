import { expect, test } from "bun:test";

// Isolate SDK and Twitter mocks from other platform tests.
const harness = String.raw`
import { expect, mock } from "bun:test";
import { readFile, stat } from "fs/promises";
const scenario = process.env.SCENARIO;
const attempt = Number(process.env.ATTEMPT);
const oauth2 = process.env.OAUTH2 === "true";
const video = scenario.startsWith("video");
const skip = scenario === "skip";
const unsupported = scenario === "unsupported" || scenario === "video-unsupported";
const mime = unsupported ? "application/octet-stream" : video ? "video/mp4" : "image/png";
const body = video ? "video bytes" : skip ? "original" : "prepared";
let filePath;
const upload = mock(async (...args) => {
  if (video && !oauth2) {
    filePath = args[0];
    expect(await readFile(filePath)).toEqual(Buffer.from(body));
    expect(args[1]).toEqual({ mimeType: mime, longVideo: true });
  } else {
    expect(args[0]).toEqual(Buffer.from(body));
    expect(args[1]).toEqual(oauth2 ? { media_type: mime } : { mimeType: mime });
    if (oauth2) expect(args[2]).toBe(5 * 1024 * 1024);
  }
  if (scenario === "video-upload-failure") throw new Error("upload rejected");
  return "media-id";
});
const mediaInfo = mock(async () => {
  if (scenario === "video-status-error") throw new Error("status rejected");
  return { processing_info: { state: scenario === "video-failed" ? "failed" : scenario === "video-timeout" || (scenario === "video-pending" && mediaInfo.mock.calls.length === 1) ? "pending" : "succeeded" } };
});
const constructors = [];
const { ApiResponseError } = await import("twitter-api-v2");
mock.module("twitter-api-v2", () => ({
  ApiResponseError,
  EUploadMimeType: { Png: "image/png", Mp4: "video/mp4" },
  TwitterApi: class {
    constructor(auth) { constructors.push(auth); }
    v1 = { uploadMedia: upload, mediaInfo };
    v2 = { uploadMedia: upload };
  },
}));
const transformError = { message: "transform rejected" };
const transform = mock(async (id, payload) => {
  expect(id).toBe("transform-buffered-image");
  expect(payload).toEqual({ url: "https://source.example/image", platform: "twitter" });
  if (scenario === "transform-throw") throw new Error("dispatch rejected");
  return scenario === "transform-failure" ? { ok: false, error: transformError }
    : { ok: true, output: { url: "https://media.example/artifact", mimeType: scenario === "mime-fallback" ? undefined : mime } };
});
const delay = mock(async (duration) => { expect(duration).toEqual({ seconds: 2 }); });
mock.module("@trigger.dev/sdk", () => ({ task: definition => definition, tasks: { triggerAndWait: transform }, wait: { for: delay } }));
globalThis.fetch = mock(async url => {
  expect(url).toBe(video || skip ? "https://source.example/image" : "https://media.example/artifact");
  return new Response(body, { status: scenario === "video-download-failure" ? 403 : 200,
    headers: { "content-type": video || skip || scenario === "mime-fallback" ? mime : "image/jpeg" } });
});
console.log = () => {};
console.error = () => {};
const { uploadTwitterMedia, TwitterMediaUploader } = await import("./upload-twitter-media.ts");
expect(uploadTwitterMedia.id).toBe("upload-twitter-media");
expect(uploadTwitterMedia.machine).toBe("medium-1x");
expect(uploadTwitterMedia.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
// Observe cleanup for OAuth2 too, while retaining the real shared download helpers.
const { PostClient } = await import("./posting/post-client.ts");
const download = PostClient.prototype.downloadToTempFile;
TwitterMediaUploader.prototype.downloadToTempFile = async function(...args) {
  const result = await download.apply(this, args);
  filePath = result.filePath;
  expect(args).toEqual(["https://source.example/image", { prefix: "twitter" }]);
  return result;
};
let error;
let result;
try {
  result = await uploadTwitterMedia.run({ medium: { type: video ? "video" : "image", url: "https://source.example/image", skip_processing: skip },
    auth: { appKey: "app", appSecret: "secret", accessToken: "token", refreshToken: "refresh", isOAuth2: oauth2 } }, { ctx: { attempt: { number: attempt } } });
} catch (caught) { error = caught; }
expect(constructors).toEqual([oauth2 ? "token" : { appKey: "app", appSecret: "secret", accessToken: "token", accessSecret: "refresh" }]);
expect(transform).toHaveBeenCalledTimes(video || skip ? 0 : 1);
if (filePath) expect(await stat(filePath).catch(() => null)).toBeNull();
let message;
if (scenario === "transform-failure") { message = "Failed to prepare Twitter image"; if (attempt === 1) expect(error.cause).toBe(transformError); }
if (scenario === "transform-throw") message = "dispatch rejected";
if (unsupported && oauth2) message = "Unsupported media type for X: " + mime;
if (scenario === "video-upload-failure") message = "upload rejected";
if (scenario === "video-download-failure") message = "Failed to download media: 403 ";
if (!oauth2 && scenario === "video-failed") message = "Media processing failed";
if (!oauth2 && scenario === "video-timeout") message = "Media processing timeout";
if (!oauth2 && scenario === "video-status-error") message = "status rejected";
if (message !== undefined) {
  if (attempt === 1) expect(error?.message).toBe(message);
  else {
    expect(error).toBeUndefined();
    const serialized = JSON.parse(JSON.stringify(result));
    expect(serialized).toMatchObject({ success: false, message, error: { name: "Error", message } });
    expect(typeof serialized.error.stack).toBe("string");
  }
} else { expect(error).toBeUndefined(); expect(result).toEqual({ success: true, mediaId: "media-id" }); }
const noUpload = scenario.startsWith("transform-") || scenario === "video-download-failure" || (unsupported && oauth2);
expect(upload).toHaveBeenCalledTimes(noUpload ? 0 : 1);
const polls = video && !oauth2 && !noUpload && scenario !== "video-upload-failure"
  ? scenario === "video-timeout" ? 4 : scenario === "video-pending" ? 2 : 1 : 0;
expect(mediaInfo).toHaveBeenCalledTimes(polls);
expect(delay).toHaveBeenCalledTimes(!oauth2 && scenario === "video-timeout" ? 4 : !oauth2 && scenario === "video-pending" ? 1 : 0);
`;

for (const oauth2 of [false, true]) {
  for (const scenario of [
    "image", "skip", "mime-fallback", "unsupported", "transform-failure", "transform-throw",
    "video", "video-pending", "video-failed", "video-timeout", "video-status-error",
    "video-upload-failure", "video-download-failure", "video-unsupported",
  ]) {
    for (const attempt of [1, 2]) {
      test(`Twitter upload task: ${scenario}, OAuth2=${oauth2}, attempt=${attempt}`, async () => {
        const child = Bun.spawn([process.execPath, "--eval", harness], {
          cwd: __dirname,
          env: { ...process.env, SCENARIO: scenario, OAUTH2: String(oauth2), ATTEMPT: String(attempt) },
          stdout: "pipe",
          stderr: "pipe",
        });
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
        ]);
        expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
      });
    }
  }
}

const apiErrorHarness = String.raw`
import { expect, mock } from "bun:test";
const twitter = await import("twitter-api-v2");
const request = { headers: { authorization: "Bearer private-access-token" }, appSecret: "private-app-secret" };
request.self = request;
const apiError = new twitter.ApiResponseError("Request failed with code 429", {
  code: 429,
  data: { errors: [{ code: 88, message: "Rate limit exceeded" }] },
  rateLimit: { limit: 100, remaining: 0, reset: 1234567890 },
  headers: { "content-type": "application/json", "x-rate-limit-remaining": "0" },
  request,
  response: {},
});
const expected = JSON.parse(JSON.stringify(apiError));
expect(expected).toEqual({ type: "response", code: 429, error: apiError.data, rateLimit: apiError.rateLimit, headers: apiError.headers });
const upload = mock(async () => { throw apiError; });
mock.module("twitter-api-v2", () => ({
  ...twitter,
  TwitterApi: class {
    v1 = { uploadMedia: upload };
    v2 = { uploadMedia: upload, tweet: () => { throw new Error("Must not tweet after failed upload"); } };
  },
}));
let childTask;
const dispatch = mock(async (id, payload) => {
  expect(id).toBe("upload-twitter-media");
  // Retryable failures must still throw the original error on attempt one.
  let firstError;
  try { await childTask.run(payload, { ctx: { attempt: { number: 1 } } }); }
  catch (error) { firstError = error; }
  expect(firstError).toBe(apiError);
  const output = JSON.parse(JSON.stringify(await childTask.run(payload, { ctx: { attempt: { number: 2 } } })));
  expect(output).toEqual({ success: false, message: apiError.message, error: expected });
  return { ok: true, output };
});
mock.module("@trigger.dev/sdk", () => ({
  task: definition => definition,
  tasks: { triggerAndWait: dispatch },
  wait: { for: () => { throw new Error("Must not delay after failed upload"); } },
}));
globalThis.fetch = mock(async () => new Response("image", { headers: { "content-type": "image/png" } }));
const logs = [];
console.error = (...args) => { logs.push(args); };
childTask = (await import("./upload-twitter-media.ts")).uploadTwitterMedia;
const { TwitterPostClient } = await import("./posting/platforms/twitter-post-client.ts");
const client = new TwitterPostClient({ app_id: "app", app_secret: "private-app-secret" });
const result = await client.post({
  postId: "post", caption: "caption", platformConfig: {},
  account: { id: "account", access_token: "private-access-token", refresh_token: "private-refresh-token", social_provider_metadata: { connection_type: process.env.OAUTH2 === "true" ? "oauth2" : "oauth1" } },
  media: [{ type: "image", url: "https://source.example/image", skip_processing: true, alt_text: "alt" }],
});
expect(result.success).toBe(false);
expect(result.error_message).toBe("Failed to post to Twitter: " + apiError.message);
expect(result.details.error.cause).toEqual(expected);
expect(result.details.error.data).toEqual(apiError.data);
const serialized = JSON.stringify(result);
expect(JSON.parse(serialized).details.error).toEqual(expected);
expect(logs[1]).toEqual(["Twitter API errors:", JSON.stringify(apiError.data.errors, null, 2)]);
for (const secret of ["private-access-token", "private-refresh-token", "private-app-secret", "authorization"]) {
  expect(serialized).not.toContain(secret);
  expect(JSON.stringify(logs)).not.toContain(secret);
}
expect(upload).toHaveBeenCalledTimes(2);
expect(dispatch).toHaveBeenCalledTimes(1);
`;

for (const oauth2 of [false, true]) {
  test(`Twitter API diagnostics survive task and PostResult serialization, OAuth2=${oauth2}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", apiErrorHarness], {
      cwd: __dirname,
      env: { ...process.env, OAUTH2: String(oauth2) },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}
