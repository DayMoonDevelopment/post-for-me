import { expect, test } from "bun:test";

// SDK and transport mocks stay in subprocesses, like the provider boundary suites.
const harness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.SCENARIO;
const calls = [];
const waits = [];
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
mock.module("./live-media-runtime", () => ({ liveMediaExecutor: (runId, postId) => {
  expect(runId).toBe("run");
  expect(postId).toBe("social-post-id");
  const submit = async (stage, id, job) => {
    calls.push({ stage, id, job });
    if (stage === "localize-thumbnail" && scenario === "thumbnail-submit-failed") throw new Error("Thumbnail enqueue failed");
    return { wait: async () => {
      expect(activeWaits++).toBe(0);
      waits.push(stage);
      // Both independent jobs must be submitted before waiting on the file.
      if (stage === "localize" && scenario !== "no-thumbnail") expect(calls).toHaveLength(2);
      await Promise.resolve();
      activeWaits--;
      if (stage === "localize-thumbnail" && scenario === "thumbnail-failed") throw new Error("Thumbnail timeout");
      if (stage === "youtube-thumbnail" && scenario === "frame-failed") throw new Error("Main media failed");
      if (stage === "localize" && scenario === "localize-failed") throw new Error("Main media failed");
      if (job.task === "media.transform-image") {
        if (scenario === "worker-failed") throw new ZenithWorkerError("FAILED", "decode failed");
        if (scenario === "animated-unsupported") throw new ZenithWorkerError("UNSUPPORTED", "Animated images are not supported");
      }
      return stored(stage, scenario === "video" || scenario === "skip-video");
    } };
  };
  return Object.assign(async (stage, id, job) => (await submit(stage, id, job)).wait(), { submit });
} }));
const ctx = { ctx: { run: { id: "run" } } };
if (scenario === "frame" || scenario === "frame-failed") {
  const { extractLiveVideoFrameTask } = await import("./extract-live-video-frame");
  const input = { postId: "social-post-id", mediumId: "medium", stored: stored("video", true), atMs: 1250 };
  if (scenario === "frame-failed") await expect(extractLiveVideoFrameTask.run(input, ctx)).rejects.toThrow("Main media failed");
  else expect(await extractLiveVideoFrameTask.run(input, ctx)).toEqual({ url: "https://zenith.example/youtube-thumbnail" });
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ stage: "youtube-thumbnail", id: "medium",
    job: { task: "media.extract-video-frame", source: { fileId: "video", versionId: "video-version" }, atMs: 1250 } });
} else if (["video", "skip-video", "image", "thumbnail-failed", "thumbnail-submit-failed", "localize-failed", "no-thumbnail"].includes(scenario)) {
  const { processLiveMedium } = await import("./process-live-medium");
  expect(processLiveMedium.maxDuration).toBe(1200);
  const medium = { id: "medium", postId: "social-post-id", url: "https://source.example/main", thumbnail_url: scenario === "no-thumbnail" ? null : "https://source.example/thumbnail",
    position: 7, provider: "instagram", alt_text: "alt", tags: [{ id: "tag" }], skip_processing: scenario === "skip-video", thumbnail_timestamp_ms: 123 };
  if (scenario === "localize-failed") {
    await expect(processLiveMedium.run({ medium }, ctx)).rejects.toThrow("Main media failed");
    expect(calls).toHaveLength(2);
    expect(waits).toEqual(["localize"]);
  } else {
    const result = JSON.parse(JSON.stringify(await processLiveMedium.run({ medium }, ctx)));
    expect(result).toMatchObject({ id: "medium", position: 7, alt_text: "alt", tags: [{ id: "tag" }], provider: "instagram", thumbnail_timestamp_ms: 123 });
    expect(result.url).toBe("https://zenith.example/" + (scenario === "video" ? "normalize-video" : "localize"));
    expect(result.stored.url).toBe(result.url);
    expect(result.thumbnail_url).toBe(scenario === "no-thumbnail" ? "" : scenario.startsWith("thumbnail-") ? medium.thumbnail_url : "https://zenith.example/localize-thumbnail");
    expect(waits).toEqual(scenario === "no-thumbnail" || scenario === "thumbnail-submit-failed" ? ["localize"]
      : scenario === "video" ? ["localize", "localize-thumbnail", "normalize-video"] : ["localize", "localize-thumbnail"]);
    if (scenario === "video") expect(calls[2].job.source).toEqual({ fileId: "localize", versionId: "localize-version" });
    else expect(calls).toHaveLength(scenario === "no-thumbnail" ? 1 : 2);
  }
} else {
  const { transformLiveImageTask } = await import("./transform-live-image");
  const platform = "instagram";
  const input = { postId: "social-post-id", url: "https://source.example/image", stored: stored("already-localized"), platform,
    skipProcessing: scenario === "skip-image", options: { firstImage: { width: 600, height: 800 }, placement: "feed", is_feed: true } };
  // Buffered platforms transform only oversized images.
  input.stored.size = 30 * 1024 * 1024;
  if (scenario === "worker-failed" || scenario === "animated-unsupported") {
    await expect(transformLiveImageTask.run(input, ctx)).rejects.toThrow();
    expect(legacy).toHaveLength(0);
  } else {
    const result = await transformLiveImageTask.run(input, ctx);
    expect(result.url).toBe(result.stored.url);
    expect(result.mimeType).toBe(result.stored.contentType);
    if (scenario === "skip-image") { expect(calls).toHaveLength(0); expect(result.url).toBe(input.stored.url); }
    else {
      expect(calls[0].job.source).toEqual({ fileId: "already-localized", versionId: "already-localized-version" });
      expect(legacy).toHaveLength(0);
    }
  }
}
expect(activeWaits).toBe(0);
`;

for (const scenario of ["video", "skip-video", "image", "thumbnail-failed", "thumbnail-submit-failed", "localize-failed", "no-thumbnail", "compatible-image", "skip-image", "worker-failed", "animated-unsupported",
  "frame", "frame-failed"]) {
  test(`live media task boundary: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname, env: { ...process.env, ZENITH_MEDIA_PERCENTAGE: "100", SCENARIO: scenario }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}

test("runtime derives lookup keys from the post ID, never the run ID", async () => {
  const child = Bun.spawn([process.execPath, "--eval", `
    import { expect, mock } from "bun:test";
    const calls = [];
    mock.module("./live-media", () => ({ createLiveMediaExecutor: (runId, deps) => {
      calls.push({ runId, lookupKeys: deps.lookupKeys });
      return () => {};
    } }));
    process.env.MEDIA_SERVER_REDIS_URL = "redis://unused.example";
    const { liveMediaExecutor } = await import("./live-media-runtime");
    liveMediaExecutor("trigger-run-id", "social-post-id");
    liveMediaExecutor("standalone-run-id");
    expect(calls).toEqual([
      { runId: "trigger-run-id", lookupKeys: [{ key: "social_post", refId: "social-post-id" }] },
      { runId: "standalone-run-id", lookupKeys: undefined },
    ]);
  `], { cwd: __dirname, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
});

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
