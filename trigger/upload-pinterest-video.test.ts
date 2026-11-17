import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock, spyOn } from "bun:test";
import axios from "axios";
import { Readable, PassThrough } from "stream";
import FormData from "form-data";
const scenario = process.env.SCENARIO;
const transport = (value) => JSON.parse(JSON.stringify(value));
const events = [];
const sdk = { task: (definition) => definition, tasks: {}, wait: { for: async () => { events.push("wait"); } } };
mock.module("@trigger.dev/sdk", () => sdk);
const sandbox = scenario === "sandbox";
const mediaUrl = "https://api" + (sandbox ? "-sandbox" : "") + ".pinterest.com/v5/media";
const medium = { type: "video", url: "https://source.example/video.mp4?signature=secret", alt_text: "alt", thumbnail_timestamp_ms: 1600,
  ...(scenario === "cover" ? { thumbnail_url: "https://source.example/cover.jpg" } : {}) };
const providerError = { code: 42, message: "provider rejection" };
let source;
const sources = [];
const forms = [];
const closedForms = [];
const destroyForm = FormData.prototype.destroy;
spyOn(FormData.prototype, "destroy").mockImplementation(function() {
  forms.push(this);
  this.once("close", () => closedForms.push(this));
  return destroyForm.call(this);
});
const sourceHttpError = { name: "AxiosError", message: scenario === "source-http-long" ? "failure ".repeat(300) : "Request failed with status code 403", status: 403, statusText: scenario === "source-http-long" ? "Forbidden ".repeat(100) : "Forbidden" };
const sourceHttpFailure = scenario.startsWith("source-http-");
const assertCleanup = async () => {
  await new Promise(resolve => setImmediate(resolve));
  for (const stream of sources) {
    expect(stream.destroyed).toBe(true);
    expect(stream.closed).toBe(true);
  }
  expect(closedForms).toEqual(forms);
  for (const form of forms) expect(form.writable).toBe(false);
  if (scenario === "early-upload-error") {
    expect(forms.length).toBe(sources.length);
    for (const stream of sources) expect(stream.readableEnded).toBe(false);
  }
};
spyOn(axios, "get").mockImplementation(async (url, options) => {
  if (url === medium.url) {
    events.push("download");
    expect(options).toEqual({ responseType: "stream" });
    if (scenario === "download-error") throw new Error("download failed");
    source = sourceHttpFailure || scenario === "early-upload-error" ? new PassThrough() : Readable.from([Buffer.from("video-bytes")]);
    sources.push(source);
    if (sourceHttpFailure || scenario === "early-upload-error") {
      source.circular = source;
      source.write("video-bytes");
    }
    if (sourceHttpFailure) {
      throw Object.assign(new Error(sourceHttpError.message), { name: "AxiosError", response: { status: 403, statusText: sourceHttpError.statusText, data: source } });
    }
    return { data: source, headers: scenario === "no-headers" ? {} : { "content-type": "video/custom", "content-length": "11" } };
  }
  events.push("poll");
  expect(url).toBe(mediaUrl + "/media-id");
  expect(options).toEqual({ headers: { Authorization: "Bearer access" } });
  return { data: { status: scenario === "poll-failed" ? "failed" : events.filter(x => x === "poll").length === 1 ? "processing" : "succeeded" } };
});
let pin;
spyOn(axios, "post").mockImplementation(async (url, body, options) => {
  if (url === mediaUrl) {
    events.push("register");
    expect(body).toEqual({ media_type: "video" });
    expect(options).toEqual({ headers: { Authorization: "Bearer access", "Content-Type": "application/json" } });
    if (scenario === "register-error") throw Object.assign(new Error("register failed"), { response: { data: providerError } });
    if (scenario === "circular-provider-error") {
      const circular = { ...providerError };
      circular.self = circular;
      throw Object.assign(new Error("register failed"), { response: { status: 400, statusText: "Bad Request", data: circular } });
    }
    return { data: { media_id: "media-id", upload_url: "https://upload.example", upload_parameters: { key: "key", "Content-Type": "ignored", policy: "policy", signature: "signature" } } };
  }
  if (url === "https://upload.example") {
    events.push("upload");
    expect(options.maxContentLength).toBe(Infinity);
    expect(options.maxBodyLength).toBe(Infinity);
    expect(options.headers["content-type"]).toStartWith("multipart/form-data; boundary=");
    expect(options.headers.Authorization).toBeUndefined();
    if (scenario === "early-upload-error") {
      expect(source.readableEnded).toBe(false);
      throw Object.assign(new Error("upload failed"), { response: { data: providerError } });
    }
    const chunks = [];
    await new Promise((resolve, reject) => { body.on("data", chunk => chunks.push(Buffer.from(chunk))); body.on("end", resolve); body.on("error", reject); body.resume(); });
    const bytes = Buffer.concat(chunks);
    const text = bytes.toString();
    const names = [...text.matchAll(/name="([^"]+)"/g)].map(match => match[1]);
    expect(names).toEqual(["Content-Type", "key", "policy", "signature", "file", "video.mp4"]);
    expect(text).toContain("multipart/form-data");
    expect(text).not.toContain("ignored");
    expect(text).toContain("video-bytes");
    expect(text).toContain("Content-Type: " + (scenario === "no-headers" ? "video/mp4" : "video/custom"));
    if (scenario !== "no-headers") expect(Number(options.headers["Content-Length"])).toBe(bytes.length);
    expect(source.readableEnded).toBe(true);
    if (scenario === "upload-error") throw Object.assign(new Error("upload failed"), { response: { data: providerError } });
    return { status: scenario === "bad-status" ? 201 : 204 };
  }
  events.push("publish");
  expect(url).toBe(mediaUrl.replace(/media$/, "pins"));
  expect(options).toEqual({ headers: { Authorization: "Bearer access", "Content-Type": "application/json" } });
  pin = body;
  return { data: { id: "pin-id" } };
});
console.error = () => {};
const { uploadPinterestVideo } = await import("./upload-pinterest-video.ts");
expect(uploadPinterestVideo.machine).toBe("medium-1x");
expect(uploadPinterestVideo.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
const failure = sourceHttpFailure || ["register-error", "download-error", "upload-error", "bad-status", "early-upload-error", "circular-provider-error"].includes(scenario);
const payload = { medium, mediaUrl, accessToken: "access" };
if (failure) {
  await expect(uploadPinterestVideo.run(transport(payload), { ctx: { attempt: { number: 1 } } })).rejects.toThrow();
  await assertCleanup();
  events.length = 0;
}
sdk.tasks.triggerAndWait = async (id, input) => {
  expect(id).toBe("upload-pinterest-video");
  expect(input).toEqual(payload);
  const output = await uploadPinterestVideo.run(transport(input), { ctx: { attempt: { number: 2 } } });
  await assertCleanup();
  expect(() => transport(output)).not.toThrow();
  return { ok: true, output: transport(output) };
};
const { PinterestPostClient } = await import("./posting/platforms/pinterest-post-client.ts");
const client = new PinterestPostClient({ app_id: "app", app_secret: "secret" });
client.getFile = client.downloadToTempFile = async () => { throw new Error("Parent cannot read bytes"); };
globalThis.fetch = async () => { throw new Error("Parent cannot fetch"); };
const result = transport(await client.post({ postId: "post", account: { id: "account", access_token: "access", social_provider_metadata: { is_sandbox: sandbox } },
  caption: "caption", media: [medium], platformConfig: { board_ids: ["board"], title: " title ", link: "https://link.example" } }));
expect(result.success, JSON.stringify(result)).toBe(!failure && scenario !== "poll-failed");
if (failure) {
  expect(result.error_message).toBe("Failed to post to Pinterest");
  expect(result.details.error).toEqual(sourceHttpFailure ? { ...sourceHttpError, message: sourceHttpError.message.slice(0, 1024), statusText: sourceHttpError.statusText.slice(0, 256) }
    : scenario === "circular-provider-error" ? { name: "Error", message: "register failed", status: 400, statusText: "Bad Request" }
    : ["register-error", "upload-error", "early-upload-error"].includes(scenario) ? providerError : scenario === "bad-status" ? "Upload failed with status: 201" : "download failed");
  expect(pin).toBeUndefined();
  expect(events).not.toContain("poll");
} else if (scenario === "poll-failed") {
  expect(result.details.error).toBe("Media processing failed");
  expect(pin).toBeUndefined();
} else {
  expect(pin).toEqual({ board_id: "board", title: "title", link: "https://link.example", description: "caption", alt_text: "alt",
    media_source: { source_type: "video_id", media_id: "media-id", ...(scenario === "cover" ? { cover_image_url: medium.thumbnail_url } : { cover_image_key_frame_time: 2 }) } });
  expect(events).toEqual(["register", "download", "upload", "poll", "wait", "poll", "publish"]);
  expect(result.provider_post_url).toBe("https://pinterest.com/pin/pin-id");
}
expect(result.details.requests[0].registerMediaRequest).toBe(mediaUrl);
expect(result.details.requests[0].timestamp).toBeString();
if (!["register-error", "circular-provider-error"].includes(scenario)) expect(result.details.responses[0].registerMediaResponse.media_id).toBe("media-id");
if (scenario === "bad-status") expect(result.details.responses[1].uploadResponse).toBe(201);
`;

for (const scenario of ["success", "sandbox", "cover", "no-headers", "register-error", "download-error", "upload-error", "bad-status", "poll-failed", "source-http-error", "source-http-long", "early-upload-error", "circular-provider-error"]) {
  test(`Pinterest video transfer and publish: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname, env: { ...process.env, SCENARIO: scenario }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}
