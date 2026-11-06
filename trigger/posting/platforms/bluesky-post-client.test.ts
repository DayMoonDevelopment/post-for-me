import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock, spyOn } from "bun:test";
const scenario = process.env.SCENARIO;
const video = scenario.startsWith("video");
const link = scenario.startsWith("link");
const events = [];
const providerError = { name: "XRPCError", message: "InvalidMimeType: image/webp is not supported", status: 400, error: "InvalidMimeType" };
let posted;
mock.module("jsdom", () => ({ JSDOM: class {} }));
const upload = mock(async (buffer, options) => {
  expect(buffer).toEqual(Buffer.from("prepared"));
  expect(options).toEqual({ encoding: "image/png" });
  return { data: { blob: "image-blob" } };
});
mock.module("@atproto/api", () => ({
  jsonToLex: (value) => value,
  AtpAgent: class {
    dispatchUrl = new URL("https://bsky.social");
    session = { did: "did:test" };
    com = { atproto: { server: { getServiceAuth: async (params) => {
      expect(params.aud).toBe("did:web:bsky.social");
      expect(params.lxm).toBe("com.atproto.repo.uploadBlob");
      events.push("auth");
      return { data: { token: "token" } };
    } } } };
    uploadBlob = upload;
    async post(payload) { posted = payload; return { uri: "at://test/post/id" }; }
  },
  RichText: class { constructor({ text }) { this.text = text; } async detectFacets() {} },
}));
const child = mock(async (id, payload) => {
  events.push(id);
  if (id === "upload-bluesky-video") {
    expect(payload).toEqual({ url: "https://source.example/video", token: "token", did: "did:test" });
    return { ok: true, output: JSON.parse(JSON.stringify({
      success: scenario !== "video-failure",
      error: { name: "Error", message: "Failed to probe Bluesky video dimensions" },
      jobStatus: { jobId: "job", blob: "video-blob" }, width: 1920, height: 1080,
      requests: [{ uploadVideoRequest: "upload-url", timestamp: "child-time" }],
      responses: [{ uploadVideoResponse: { jobId: "job" }, timestamp: "child-time" }],
    })) };
  }
  if (id.startsWith("upload-bluesky-")) {
    expect(payload.service).toBe("https://bsky.social/");
    expect(payload.session).toEqual({ did: "did:test" });
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    if (link) {
      expect(id).toBe("upload-bluesky-link-preview");
      expect(payload.url).toBe("https://example.com/page");
      if (scenario === "link-throw") throw new Error("child failed");
      return scenario === "link-failure" ? { ok: false, error: {} } : { ok: true, output: scenario === "link-null" ? null : { $type: "app.bsky.embed.external", external: { uri: payload.url, title: "title", description: "description" } } };
    }
    expect(payload.url).toBe("https://media.example/artifact");
    expect(payload.encoding).toBe("image/png");
    if (scenario === "upload-provider-rejection") return { ok: false, error: JSON.parse(JSON.stringify(providerError)) };
    return scenario === "upload-failure" ? { ok: false, error: {} } : { ok: true, output: "image-blob" };
  }
  expect(id).toBe("transform-buffered-image");
  expect(payload).toEqual({ url: "https://source.example/image", platform: "bluesky", skipProcessing: scenario === "skip" });
  if (scenario === "throw") throw new Error("child failed");
  return scenario === "failure" ? { ok: false, error: {} } : { ok: true, output: {
    url: "https://media.example/artifact", mimeType: "image/png", width: 4000, height: 3000,
  } };
});
const sdk = { tasks: { triggerAndWait: child }, logger: { error() {} }, wait: { for: async () => {} } };
mock.module("@trigger.dev/sdk/v3", () => sdk);
const nodeFetch = await import("node-fetch");
spyOn(nodeFetch, "default").mockImplementation(async () => { throw new Error("Parent must not upload media"); });
globalThis.fetch = mock(async () => { throw new Error("Parent must not download media"); });
console.error = () => {};
const { BlueskyPostClient } = await import("./bluesky-post-client.ts");
const client = new BlueskyPostClient({ app_id: "app", app_secret: "secret" });
client.downloadToTempFile = async () => { throw new Error("Parent must not stage media"); };
client.unlinkQuiet = async () => { throw new Error("Parent must not clean up media"); };
const medium = { type: video ? "video" : "image", url: "https://source.example/" + (video ? "video" : "image"), skip_processing: scenario === "skip", alt_text: scenario === "caption-alt" || scenario === "default-alt" ? "" : "alt" };
const result = await client.post({ postId: "post", account: { id: "account" }, caption: link ? "https://example.com/page)." : scenario === "default-alt" ? "" : "caption",
  media: link ? [] : scenario === "multi" ? [medium, { type: "video" }, medium, medium, medium, medium] : [medium] });
const failure = ["failure", "throw", "upload-failure", "upload-provider-rejection", "video-failure"].includes(scenario);
expect(result.success, JSON.stringify(result)).toBe(!failure);
if (scenario === "upload-provider-rejection" || scenario === "upload-failure") {
  const serialized = JSON.parse(JSON.stringify(result));
  const message = scenario === "upload-provider-rejection" ? providerError.message : "Failed to upload Bluesky image";
  expect(serialized.error_message).toBe(message);
  expect(serialized.details.error).toEqual({ name: "Error", message, cause: scenario === "upload-provider-rejection" ? providerError : {} });
  expect(posted).toBeUndefined();
}
if (video) {
  expect(events).toEqual(["auth", "upload-bluesky-video"]);
  expect(result.details.requests[0]).toEqual({ uploadVideoRequest: "upload-url", timestamp: "child-time" });
  if (failure) expect(result.error_message).toBe("Failed to probe Bluesky video dimensions");
  if (!failure) expect(posted.embed.aspectRatio).toEqual({ width: 1920, height: 1080 });
} else if (link) {
  expect(child).toHaveBeenCalledTimes(1);
  expect(posted.embed).toEqual(["link-failure", "link-throw", "link-null"].includes(scenario) ? undefined : { $type: "app.bsky.embed.external", external: { uri: "https://example.com/page", title: "title", description: "description" } });
  expect(upload).not.toHaveBeenCalled();
  expect(globalThis.fetch).not.toHaveBeenCalled();
} else {
  const count = scenario === "multi" ? 3 : 1;
  expect(child).toHaveBeenCalledTimes(["failure", "throw"].includes(scenario) ? 1 : count * 2);
  expect(upload).not.toHaveBeenCalled();
  expect(globalThis.fetch).not.toHaveBeenCalled();
  if (!failure) for (const image of posted.embed.images) {
    expect(image).toEqual({ alt: scenario === "caption-alt" ? "caption" : scenario === "default-alt" ? "Image" : "alt", image: "image-blob", aspectRatio: { width: 4000, height: 3000 } });
  }
}
`;

for (const scenario of ["success", "skip", "multi", "caption-alt", "default-alt", "failure", "throw", "upload-failure", "upload-provider-rejection", "link", "link-null", "link-failure", "link-throw", "video", "video-failure"]) {
  test(`Bluesky child boundary: ${scenario}`, async () => {
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
