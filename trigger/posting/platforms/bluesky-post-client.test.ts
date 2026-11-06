import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock, spyOn } from "bun:test";
const scenario = process.env.SCENARIO;
const video = scenario.startsWith("video");
const events = [];
let posted;
mock.module("jsdom", () => ({ JSDOM: class {} }));
const upload = mock(async (buffer, options) => {
  expect(buffer).toEqual(Buffer.from("prepared"));
  expect(options).toEqual({ encoding: "image/png" });
  return { data: { blob: "image-blob" } };
});
mock.module("@atproto/api", () => ({
  AtpAgent: class {
    dispatchUrl = new URL("https://bsky.social");
    session = { did: "did:test" };
    com = { atproto: { server: { getServiceAuth: async () => ({ data: { token: "token" } }) } } };
    uploadBlob = upload;
    async post(payload) { posted = payload; return { uri: "at://test/post/id" }; }
  },
  RichText: class { constructor({ text }) { this.text = text; } async detectFacets() {} },
}));
const child = mock(async (id, payload) => {
  events.push(id);
  if (id === "ffmpeg-compress-video") {
    expect(payload).toEqual({ url: "https://source.example/video", maxSizeBytes: 100000000 });
    return { ok: true, output: "https://media.example/compressed.mp4" };
  }
  if (video) {
    expect(id).toBe("probe-video-dimensions");
    expect(payload).toEqual({ url: "https://media.example/compressed.mp4" });
    return scenario === "video-failure" ? { ok: false, error: {} } : { ok: true, output: { width: 1920, height: 1080 } };
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
spyOn(nodeFetch, "default").mockImplementation(async () => {
  events.push("upload-video");
  return { json: async () => ({ jobId: "job", blob: "video-blob" }) };
});
globalThis.fetch = mock(async (url) => {
  expect(url).toBe("https://media.example/artifact");
  return new Response("prepared", { headers: { "content-type": "application/octet-stream" } });
});
console.error = () => {};
const { BlueskyPostClient } = await import("./bluesky-post-client.ts");
const client = new BlueskyPostClient({ app_id: "app", app_secret: "secret" });
client.downloadToTempFile = async (url) => {
  expect(url).toBe("https://media.example/compressed.mp4");
  events.push("stage");
  return { filePath: "/dev/null", mimeType: "video/mp4", size: 0 };
};
client.unlinkQuiet = async () => { events.push("unlink"); };
const medium = { type: video ? "video" : "image", url: "https://source.example/" + (video ? "video" : "image"), skip_processing: scenario === "skip", alt_text: "alt" };
const result = await client.post({ postId: "post", account: { id: "account" }, caption: "caption",
  media: scenario === "multi" ? [medium, { type: "video" }, medium, medium, medium, medium] : [medium] });
const failure = ["failure", "throw", "video-failure"].includes(scenario);
expect(result.success, JSON.stringify(result)).toBe(!failure);
if (video) {
  expect(events).toEqual(scenario === "video-failure" ? ["ffmpeg-compress-video", "probe-video-dimensions"]
    : ["ffmpeg-compress-video", "probe-video-dimensions", "stage", "upload-video", "unlink"]);
  if (!failure) expect(posted.embed.aspectRatio).toEqual({ width: 1920, height: 1080 });
} else {
  const count = scenario === "multi" ? 3 : 1;
  expect(child).toHaveBeenCalledTimes(count);
  expect(upload).toHaveBeenCalledTimes(failure ? 0 : count);
  expect(globalThis.fetch).toHaveBeenCalledTimes(failure ? 0 : count);
  if (!failure) for (const image of posted.embed.images) {
    expect(image).toEqual({ alt: "alt", image: "image-blob", aspectRatio: { width: 4000, height: 3000 } });
  }
}
`;

for (const scenario of ["success", "skip", "multi", "failure", "throw", "video", "video-failure"]) {
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
