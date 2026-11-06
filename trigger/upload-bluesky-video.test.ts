import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock, spyOn } from "bun:test";
import { AtpAgent, BlobRef } from "@atproto/api";
import { access } from "fs/promises";
const scenario = process.env.SCENARIO;
const transport = (value) => JSON.parse(JSON.stringify(value));
const events = [];
const blob = { $type: "blob", ref: { $link: "bafkreigh2akiscaildcw4535x3ql5ojybhbnckcb27pww36r7oe4qzwqsu" }, mimeType: "video/mp4", size: 11 };
const job = { jobId: "job", did: "did:plc:test", state: "JOB_STATE_COMPLETED", ...(scenario === "poll" || scenario === "poll-failed" ? {} : { blob }) };
const sourceUrl = "https://source.example/original.mp4?token=source";
const compressedUrl = "https://artifact.example/compressed.mp4?token=artifact";
const fileUrl = scenario === "compression-failure" ? sourceUrl : compressedUrl;
let path;
let posted;
globalThis.fetch = mock(async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  if (request.url === fileUrl) {
    events.push("download");
    if (scenario === "download-error") return new Response("bad", { status: 403, statusText: "Forbidden" });
    return new Response("video-bytes", { headers: { "content-type": "video/custom" } });
  }
  if (request.url.includes("/com.atproto.server.getServiceAuth")) {
    events.push("auth");
    expect(request.headers.get("authorization")).toBe("Bearer access");
    const params = new URL(request.url).searchParams;
    expect(params.get("aud")).toBe("did:web:bsky.social");
    expect(params.get("lxm")).toBe("com.atproto.repo.uploadBlob");
    expect(Math.abs(Number(params.get("exp")) - Date.now() / 1000 - 1800)).toBeLessThan(5);
    return Response.json({ token: "service-token" });
  }
  if (request.url.includes("/app.bsky.video.getJobStatus")) {
    events.push("poll");
    return Response.json({ jobStatus: { ...job, blob: scenario === "poll-failed" ? undefined : blob, state: scenario === "poll-failed" ? "JOB_STATE_FAILED" : "JOB_STATE_COMPLETED", error: scenario === "poll-failed" ? "processing_error" : undefined, message: scenario === "poll-failed" ? "invalid video" : undefined } });
  }
  events.push("publish");
  expect(request.url).toBe("https://bsky.social/xrpc/com.atproto.repo.createRecord");
  expect(request.headers.get("authorization")).toBe("Bearer access");
  posted = await request.json();
  expect(posted.record.embed).toEqual({ $type: "app.bsky.embed.video", video: blob, aspectRatio: { width: 1920, height: 1080 } });
  return Response.json({ uri: "at://did:plc:test/app.bsky.feed.post/id", cid: blob.ref.$link });
});
const nodeFetch = await import("node-fetch");
spyOn(nodeFetch, "default").mockImplementation(async (url, options) => {
  events.push("upload");
  expect(url.origin + url.pathname).toBe("https://video.bsky.app/xrpc/app.bsky.video.uploadVideo");
  expect(url.searchParams.get("did")).toBe("did:plc:test");
  expect(url.searchParams.get("name")).toBe(scenario === "compression-failure" ? "original.mp4" : "compressed.mp4");
  expect(options.method).toBe("POST");
  expect(options.headers).toEqual({ Authorization: "Bearer service-token", "Content-Type": "video/custom", "Content-Length": "11" });
  path = options.body.path;
  const chunks = [];
  for await (const chunk of options.body) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toBe("video-bytes");
  if (scenario === "upload-error") throw new Error("stream upload failed");
  return { json: async () => {
    if (scenario === "json-error") throw new Error("invalid JSON");
    return scenario === "no-job" ? { error: "InvalidVideo" } : job;
  } };
});
const sdk = { task: definition => definition, tasks: {}, logger: { error() {} }, wait: { for: async () => {} } };
mock.module("@trigger.dev/sdk", () => sdk);
mock.module("@trigger.dev/sdk/v3", () => sdk);
const { uploadBlueskyVideo } = await import("./upload-bluesky-video.ts");
expect(uploadBlueskyVideo.machine).toBe("medium-1x");
expect(uploadBlueskyVideo.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
sdk.tasks.triggerAndWait = async (id, payload) => {
  payload = transport(payload);
  events.push(id);
  if (id === "ffmpeg-compress-video") {
    expect(payload).toEqual({ url: sourceUrl, maxSizeBytes: 100000000 });
    return scenario === "compression-failure" ? { ok: false, error: {} } : { ok: true, output: compressedUrl };
  }
  if (id === "probe-video-dimensions") {
    expect(payload).toEqual({ url: fileUrl });
    return scenario === "probe-error" ? { ok: false, error: { message: "probe failed" } } : { ok: true, output: { width: 1920, height: 1080 } };
  }
  expect(id).toBe("upload-bluesky-video");
  expect(payload).toEqual({ url: sourceUrl, token: "service-token", did: "did:plc:test" });
  return { ok: true, output: transport(await uploadBlueskyVideo.run(payload, { ctx: { attempt: { number: 2 } } })) };
};
const failure = ["probe-error", "download-error", "upload-error", "json-error"].includes(scenario);
if (failure) {
  await expect(uploadBlueskyVideo.run({ url: sourceUrl, token: "service-token", did: "did:plc:test" }, { ctx: { attempt: { number: 1 } } })).rejects.toThrow();
  if (path) await expect(access(path)).rejects.toThrow();
  events.length = 0;
}
spyOn(AtpAgent.prototype, "resumeSession").mockImplementation(async function(session) { this.sessionManager.session = session; });
const originalPost = AtpAgent.prototype.post;
spyOn(AtpAgent.prototype, "post").mockImplementation(async function(payload) {
  expect(payload.embed.video).toBeInstanceOf(BlobRef);
  return originalPost.call(this, payload);
});
console.error = () => {};
console.log = () => {};
const { BlueskyPostClient } = await import("./posting/platforms/bluesky-post-client.ts");
const client = new BlueskyPostClient({ app_id: "app", app_secret: "secret" });
await client.refreshAccessToken({ access_token: "access", refresh_token: "refresh", social_provider_user_id: "did:plc:test", social_provider_user_name: "test.example", access_token_expires_at: new Date().toISOString() });
client.downloadToTempFile = async () => { throw new Error("Parent cannot stage bytes"); };
const result = transport(await client.post({ postId: "post", account: { id: "account", social_provider_user_name: "test.example" }, caption: "caption", media: [{ type: "video", url: sourceUrl }] }));
expect(result.success, JSON.stringify(result)).toBe(!failure && scenario !== "no-job" && scenario !== "poll-failed");
expect(events.slice(0, 4)).toEqual(["auth", "upload-bluesky-video", "ffmpeg-compress-video", "probe-video-dimensions"]);
if (path) await expect(access(path)).rejects.toThrow();
if (failure) {
  expect(result.error_message).toBe({ "probe-error": "Failed to probe Bluesky video dimensions", "download-error": "Failed to download media: 403 Forbidden", "upload-error": "stream upload failed", "json-error": "invalid JSON" }[scenario]);
  expect(posted).toBeUndefined();
  if (["upload-error", "json-error"].includes(scenario)) expect(result.details.requests.at(-1).uploadVideoRequest).toContain("https://video.bsky.app/");
} else if (scenario === "no-job") {
  expect(result.error_message).toBe("Unable to start video upload, InvalidVideo");
} else if (scenario === "poll-failed") {
  expect(result.error_message).toBe("Failed to process video: processing_error: invalid video");
} else {
  expect(events.at(-1)).toBe("publish");
  expect(result.provider_post_url).toBe("https://bsky.app/profile/test.example/post/id");
  expect(events.includes("poll")).toBe(scenario === "poll");
}
`;

for (const scenario of ["success", "compression-failure", "probe-error", "download-error", "upload-error", "json-error", "no-job", "poll", "poll-failed"]) {
  test(`Bluesky video transfer and record: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname, env: { ...process.env, SCENARIO: scenario }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}
