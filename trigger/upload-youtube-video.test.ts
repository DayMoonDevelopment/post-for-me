import { expect, test } from "bun:test";

// Separate processes keep SDK/Google mocks isolated from other upload tests.
const harness = String.raw`
import { expect, mock } from "bun:test";
import fs from "node:fs/promises";
import { OutOfMemoryError } from "@trigger.dev/sdk";
const scenario = process.env.SCENARIO;
const transport = (value) => JSON.parse(JSON.stringify(value));
const waits = [];
mock.module("@trigger.dev/sdk", () => ({ OutOfMemoryError, task: (definition) => definition, logger: { info() {}, warn() {} }, wait: { for: async (value) => { waits.push(value.seconds); } } }));
const credentials = { access_token: "snapshot", refresh_token: "refresh", expiry_date: 123456789 };
let tokenCalls = 0;
mock.module("googleapis", () => ({ google: { auth: { OAuth2: class {
  constructor(...args) { expect(args).toEqual(["id", "secret", "redirect"]); }
  setCredentials(value) { expect(value).toEqual(credentials); }
  async getAccessToken() {
    tokenCalls++;
    if (scenario === "auth-error" && tokenCalls % 2 === 0) throw Object.assign(new Error("auth failed"), { response: { data: { error: "invalid_grant" } } });
    if (scenario === "missing-token") return {};
    return tokenCalls % 2 ? { token: "current-token" } : { res: { data: { access_token: "current-token" } } };
  }
} } } }));
const { uploadYoutubeVideo: child } = await import("./upload-youtube-video.ts");
expect(child.id).toBe("upload-youtube-video");
expect(child.machine).toBe("medium-1x");
expect(child.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
const medium = { id: "youtube-test-" + scenario + "-" + process.pid, type: "video", url: "https://source.example/video" };
const videoRequest = { part: ["snippet", "status"], requestBody: { snippet: { title: "title", description: "description" }, status: { privacyStatus: "private" } } };
const payload = { medium, videoRequest, oauth: { clientId: "id", clientSecret: "secret", redirectUri: "redirect", credentials } };
const chunkSize = 8 * 1024 * 1024;
const big = ["chunks", "resume", "missing-range", "premature"].includes(scenario);
const size = big ? chunkSize + 5 : 5;
const bytes = Buffer.alloc(size, 97);
const tempPaths = new Set();
const originalOpen = fs.open.bind(fs);
const originalUnlink = fs.unlink.bind(fs);
fs.open = async (file, ...args) => {
  tempPaths.add(file);
  const handle = await originalOpen(file, ...args);
  if (scenario === "short-read") {
    const read = handle.read.bind(handle);
    handle.read = async (...args) => ({ ...await read(...args), bytesRead: 0 });
  }
  return handle;
};
fs.unlink = async (file) => { tempPaths.add(file); return originalUnlink(file); };
let metadataCancelled = 0;
let downloads = 0;
let sessionCalls = 0;
let chunkCalls = 0;
let queries = 0;
const ranges = [];
globalThis.fetch = mock(async (url, init) => {
  if (url === medium.url) {
    if (init?.method === "HEAD") {
      if (scenario === "oom-head") throw new OutOfMemoryError();
      if (scenario.startsWith("range-")) return new Response(null, { status: 405 });
      return new Response(null, { headers: { "content-length": String(size), "content-type": "video/custom" } });
    }
    if (init?.headers?.Range) {
      expect(init.headers.Range).toBe("bytes=0-0");
      const body = new ReadableStream({ cancel() { metadataCancelled++; } });
      const response = new Response(body, { status: scenario === "range-ignored" ? 200 : scenario === "range-http" ? 403 : scenario === "range-not-found" ? 404 : 206, statusText: scenario === "range-http" ? "Forbidden" : scenario === "range-not-found" ? "Not Found" : "OK", headers: { "content-range": scenario === "range-malformed" ? "bytes 0-4/5" : scenario === "range-unknown" ? "bytes 0-0/*" : "bytes 0-0/5" } });
      response.arrayBuffer = response.text = response.json = () => { throw new Error("metadata body must never be consumed"); };
      return response;
    }
    downloads++;
    if (scenario === "oom-download") throw new OutOfMemoryError();
    if (scenario === "download-network") throw new Error("download failed");
    if (scenario === "download-http") return new Response("denied", { status: 403 });
    const response = new Response(scenario === "size-mismatch" || scenario === "download-retry" && downloads === 1 ? "bad" : bytes);
    response.arrayBuffer = response.text = () => { throw new Error("download must be streamed"); };
    return response;
  }
  expect(init.headers.Authorization).toBe("Bearer current-token");
  if (url.startsWith("https://www.googleapis.com/upload/")) {
    sessionCalls++;
    expect(url).toEndWith("uploadType=resumable&part=snippet%2Cstatus");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Upload-Content-Length"]).toBe(String(size));
    expect(init.headers["X-Upload-Content-Type"]).toBe(scenario.startsWith("range-") ? "video/mp4" : "video/custom");
    expect(JSON.parse(init.body)).toEqual(videoRequest.requestBody);
    if (scenario === "oom-init") throw new OutOfMemoryError();
    if (scenario === "init-error") return new Response("denied", { status: 403 });
    if (scenario === "init-retry" && sessionCalls < 3) return Response.json({ error: { errors: [{ reason: "alreadyExists" }] } }, { status: sessionCalls === 1 ? 409 : 503 });
    return new Response(null, { headers: { location: "https://upload.example/session" } });
  }
  expect(url).toBe("https://upload.example/session");
  expect(init.method).toBe("PUT");
  if (init.headers["Content-Length"] === "0") {
    queries++;
    expect(init.headers["Content-Range"]).toBe("bytes */" + size);
    if (scenario === "premature") return new Response(null, { status: 403 });
    return new Response(null, { status: 308, headers: { range: "bytes=0-" + (scenario === "resume" ? 4 : chunkSize - 1) } });
  }
  chunkCalls++;
  const range = init.headers["Content-Range"];
  ranges.push(range);
  const match = range.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  const start = Number(match[1]), end = Number(match[2]);
  expect(Number(match[3])).toBe(size);
  expect(init.body).toBeInstanceOf(Buffer);
  expect(init.body.length).toBeLessThanOrEqual(chunkSize);
  expect(init.body).toEqual(bytes.subarray(start, end + 1));
  expect(init.headers["Content-Length"]).toBe(String(init.body.length));
  if (scenario === "oom-chunk") throw new OutOfMemoryError();
  if (scenario === "upload-error") return new Response("denied", { status: 403 });
  if (scenario === "http-retry" && chunkCalls < 3) return new Response(null, { status: chunkCalls === 1 ? 429 : 503 });
  if (scenario === "resume" && chunkCalls === 1) return new Response("lost connection", { status: 400 });
  if (scenario === "premature") return Response.json({ id: "video" });
  if (end + 1 < size) return new Response(null, { status: 308, headers: scenario === "missing-range" ? {} : { range: "bytes=0-" + end } });
  return Response.json({ id: "video" });
});
const run = (attempt) => child.run(transport(payload), { ctx: { attempt: { number: attempt } } });
const failure = ["range-ignored", "range-malformed", "range-unknown", "range-http", "range-not-found", "size-mismatch", "download-network", "download-http", "init-error", "auth-error", "missing-token", "upload-error", "premature", "short-read"].includes(scenario);
if (scenario.startsWith("oom-")) {
  await expect(run(1)).rejects.toBeInstanceOf(OutOfMemoryError);
  expect(sessionCalls).toBe(["oom-init", "oom-chunk"].includes(scenario) ? 1 : 0);
  expect(downloads).toBe(scenario === "oom-head" ? 0 : 1);
  expect(chunkCalls).toBe(scenario === "oom-chunk" ? 1 : 0);
  expect(waits).toEqual([]);
} else if (failure) {
  // Model SDK retry behavior: a returned failure envelope must not replay the task.
  let runs = 0;
  const execute = async () => {
    runs++;
    try { return await run(1); }
    catch { runs++; return run(2); }
  };
  const output = transport(await execute());
  expect(runs).toBe(1);
  expect(output.success).toBe(false);
  expect(output.error.message).toBeTruthy();
  expect(output.error.stack).toContain("upload-youtube-video.ts");
  if (scenario === "auth-error") expect(output.error.response.data).toEqual({ error: "invalid_grant" });
  if (scenario.startsWith("range-")) {
    expect(output.error.message).toBe(scenario === "range-http" ? "Could not determine file size: 403 Forbidden" : scenario === "range-not-found" ? "Could not determine file size: 404 Not Found" : "Could not determine YouTube upload file size");
    expect(metadataCancelled).toBe(1);
    expect(downloads).toBe(0);
    expect(sessionCalls).toBe(0);
  } else {
    expect(output.requests[0].postRequest.upload.fileSize).toBe(size);
    expect(output.requests[0].timestamp).toBeTruthy();
    expect(sessionCalls).toBe(["init-error", "auth-error", "upload-error", "premature", "short-read"].includes(scenario) ? 1 : 0);
    if (sessionCalls) expect(downloads).toBe(1);
  }
} else {
  const output = transport(await run(1));
  expect(output.success).toBe(true);
  expect(output.video).toEqual({ id: "video" });
  expect(output.responses.at(-1).postResponse).toEqual({ id: "video" });
  expect(output.requests[0].postRequest).toEqual({ ...videoRequest, media: medium, upload: { protocol: "resumable", chunkSizeBytes: chunkSize, fileSize: size, mimeType: scenario.startsWith("range-") ? "video/mp4" : "video/custom" } });
  if (scenario === "range-valid") expect(metadataCancelled).toBe(1);
  if (scenario === "download-retry") { expect(downloads).toBe(2); expect(waits).toContain(1); }
  if (scenario === "init-retry") { expect(sessionCalls).toBe(3); expect(waits).toEqual([1, 2]); }
  if (scenario === "http-retry") { expect(chunkCalls).toBe(3); expect(waits).toEqual([0.5, 1]); }
  if (big) {
    expect(ranges[0]).toBe("bytes 0-" + (chunkSize - 1) + "/" + size);
    expect(ranges[1]).toBe("bytes " + (scenario === "resume" ? 5 : chunkSize) + "-" + (size - 1) + "/" + size);
    expect(chunkCalls).toBe(2);
    expect(queries).toBe(scenario === "chunks" ? 0 : 1);
  }
}
for (const file of tempPaths) {
  expect(file).toContain("youtube_" + medium.id);
  expect(await fs.stat(file).then(() => true, () => false)).toBe(false);
}
`;

for (const scenario of [
  "success", "chunks", "resume", "missing-range", "range-valid", "range-ignored",
  "range-malformed", "range-unknown", "range-http", "range-not-found", "download-retry", "size-mismatch",
  "download-network", "download-http", "init-retry", "init-error", "auth-error",
  "missing-token", "http-retry", "upload-error", "premature", "short-read",
  "oom-head", "oom-download", "oom-init", "oom-chunk",
]) {
  test(`YouTube video upload child: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname,
      env: { ...process.env, SCENARIO: scenario },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}
