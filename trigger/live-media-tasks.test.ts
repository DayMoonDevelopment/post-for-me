import { expect, test } from "bun:test";

// SDK and transport mocks stay in subprocesses, like the provider boundary suites.
const harness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.SCENARIO;
const calls = [];
const legacy = [];
let activeWaits = 0;
const stored = (name, video = false) => ({ fileId: name, versionId: name + "-version", path: "publishing/" + name,
  url: "https://zenith.example/" + name, contentType: video ? "video/mp4" : "image/jpeg", size: 100,
  media: video ? { kind: "video", width: 1920, height: 1080, durationSeconds: 60, frameRate: 30,
    bitrate: 10000, video: { codec: "h264" }, audio: null } :
    { kind: "image", width: 600, height: 800, orientation: 1, format: "jpeg", hasAlpha: false } });
mock.module("@trigger.dev/sdk", () => ({ task: definition => definition, logger: { warn() {} },
  tasks: { triggerAndWait: async (id, payload) => {
    expect(activeWaits).toBe(0);
    legacy.push({ id, payload });
    if (scenario === "legacy-failed") return { ok: false, error: {} };
    return { ok: true, output: id === "transform-instagram-image" ? { signedUrl: "https://legacy.example/image" }
      : id === "transform-tiktok-image" ? "https://legacy.example/image" : { url: "https://legacy.example/image" } };
  } } }));
const { ZenithWorkerError } = await import("./live-media");
mock.module("./live-media-runtime", () => ({ liveMediaExecutor: () => async (stage, id, job) => {
  expect(activeWaits++).toBe(0);
  calls.push({ stage, id, job });
  await Promise.resolve();
  activeWaits--;
  if (stage === "localize-thumbnail" && scenario === "thumbnail-failed") throw new Error("Thumbnail timeout");
  if (stage === "localize" && scenario === "localize-failed") throw new Error("Main media failed");
  if (job.task === "media.transform-image") {
    if (scenario === "worker-failed") throw new ZenithWorkerError("FAILED", "decode failed");
    if (scenario.startsWith("animated") || scenario === "legacy-failed") throw new ZenithWorkerError("UNSUPPORTED", "Animated images are not supported");
  }
  return stored(stage, scenario === "video" || scenario === "skip-video");
} }));
const ctx = { ctx: { run: { id: "run" } } };
if (["video", "skip-video", "image", "thumbnail-failed", "localize-failed"].includes(scenario)) {
  const { processLiveMedium } = await import("./process-live-medium");
  const medium = { id: "medium", url: "https://source.example/main", thumbnail_url: "https://source.example/thumbnail",
    position: 7, provider: "instagram", alt_text: "alt", tags: [{ id: "tag" }], skip_processing: scenario === "skip-video", thumbnail_timestamp_ms: 123 };
  if (scenario === "localize-failed") {
    await expect(processLiveMedium.run({ medium }, ctx)).rejects.toThrow("Main media failed");
    expect(calls).toHaveLength(1);
  } else {
    const result = JSON.parse(JSON.stringify(await processLiveMedium.run({ medium }, ctx)));
    expect(result).toMatchObject({ id: "medium", position: 7, alt_text: "alt", tags: [{ id: "tag" }], provider: "instagram", thumbnail_timestamp_ms: 123 });
    expect(result.url).toBe("https://zenith.example/" + (scenario === "video" ? "normalize-video" : "localize"));
    expect(result.stored.url).toBe(result.url);
    expect(result.thumbnail_url).toBe(scenario === "thumbnail-failed" ? medium.thumbnail_url : "https://zenith.example/localize-thumbnail");
    if (scenario === "video") expect(calls[2].job.source).toEqual({ fileId: "localize", versionId: "localize-version" });
    else expect(calls).toHaveLength(2);
  }
} else {
  const { transformLiveImageTask } = await import("./transform-live-image");
  const platform = scenario.startsWith("animated-") ? scenario.slice("animated-".length) : "instagram";
  const input = { url: "https://source.example/image", stored: stored("already-localized"), platform,
    skipProcessing: scenario === "skip-image", options: { firstImage: { width: 600, height: 800 }, placement: "feed", is_feed: true } };
  // Buffered platforms transform only oversized images.
  input.stored.size = 30 * 1024 * 1024;
  if (scenario === "worker-failed" || scenario === "legacy-failed") {
    await expect(transformLiveImageTask.run(input, ctx)).rejects.toThrow();
    expect(legacy).toHaveLength(scenario === "legacy-failed" ? 1 : 0);
  } else {
    const result = await transformLiveImageTask.run(input, ctx);
    expect(result.url).toBe(result.stored.url);
    expect(result.mimeType).toBe(result.stored.contentType);
    if (scenario === "skip-image") { expect(calls).toHaveLength(0); expect(result.url).toBe(input.stored.url); }
    else {
      expect(calls[0].job.source).toEqual({ fileId: "already-localized", versionId: "already-localized-version" });
      if (scenario.startsWith("animated-")) {
        expect(legacy).toHaveLength(1);
        expect(legacy[0].id).toBe(platform === "instagram" ? "transform-instagram-image" : platform.startsWith("tiktok") ? "transform-tiktok-image" : "transform-buffered-image");
        expect(calls.at(-1).job).toEqual({ task: "media.localize", url: "https://legacy.example/image" });
        expect(result.url).toBe("https://zenith.example/localize-animated-output");
      } else expect(legacy).toHaveLength(0);
    }
  }
}
expect(activeWaits).toBe(0);
`;

for (const scenario of ["video", "skip-video", "image", "thumbnail-failed", "localize-failed", "compatible-image", "skip-image", "worker-failed", "legacy-failed",
  "animated-instagram", "animated-tiktok", "animated-tiktok_business", "animated-twitter", "animated-bluesky"]) {
  test(`live media task boundary: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname, env: { ...process.env, SCENARIO: scenario }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}

test("missing live Redis configuration fails explicitly", async () => {
  const child = Bun.spawn([process.execPath, "--eval", `
    import { expect } from "bun:test";
    delete process.env.MEDIA_SERVER_REDIS_URL;
    const { liveMediaExecutor } = await import("./live-media-runtime");
    expect(() => liveMediaExecutor("run")).toThrow("MEDIA_SERVER_REDIS_URL is required");
  `], { cwd: __dirname, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
});
