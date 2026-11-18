import { afterEach, expect, test } from "bun:test";
import { resolveMediaProcessingBackend, zenithMediaPercentage } from "./media-processing-backend";

const original = process.env.ZENITH_MEDIA_PERCENTAGE;
afterEach(() => {
  if (original === undefined) delete process.env.ZENITH_MEDIA_PERCENTAGE;
  else process.env.ZENITH_MEDIA_PERCENTAGE = original;
});

test("defaults to zero and rejects invalid rollout percentages", () => {
  delete process.env.ZENITH_MEDIA_PERCENTAGE;
  expect(zenithMediaPercentage()).toBe(0);
  for (const value of ["", " ", "invalid", "NaN", "Infinity", "-1", "101"]) expect(zenithMediaPercentage(value)).toBe(0);
  expect(zenithMediaPercentage("0.5")).toBe(0.5);
  expect(zenithMediaPercentage("100")).toBe(100);
  expect(resolveMediaProcessingBackend("post")).toBe("trigger");
});

test("zero and one hundred route all keys to their respective backend", () => {
  for (const percentage of ["0", "100"]) {
    process.env.ZENITH_MEDIA_PERCENTAGE = percentage;
    for (let i = 0; i < 1000; i++) expect(resolveMediaProcessingBackend(`post-${i}`)).toBe(percentage === "0" ? "trigger" : "zenith");
  }
});

test("sampling is deterministic, approximately proportional, and monotonically expands", () => {
  process.env.ZENITH_MEDIA_PERCENTAGE = "10";
  const keys = Array.from({ length: 10000 }, (_, i) => `post-${i}`);
  const selected = keys.filter((key) => resolveMediaProcessingBackend(key) === "zenith");
  expect(selected.length).toBeGreaterThan(850);
  expect(selected.length).toBeLessThan(1150);
  expect(keys.filter((key) => resolveMediaProcessingBackend(key) === "zenith")).toEqual(selected);
  process.env.ZENITH_MEDIA_PERCENTAGE = "20";
  for (const key of selected) expect(resolveMediaProcessingBackend(key)).toBe("zenith");
});

test("explicit parent decisions override the percentage in both directions", () => {
  process.env.ZENITH_MEDIA_PERCENTAGE = "100";
  expect(resolveMediaProcessingBackend("post", "trigger")).toBe("trigger");
  process.env.ZENITH_MEDIA_PERCENTAGE = "0";
  expect(resolveMediaProcessingBackend("post", "zenith")).toBe("zenith");
});

const harness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.SCENARIO.replace("default-", "legacy-");
const calls = [];
const children = [];
const sourceUrl = "https://source.example/media";
const outputUrl = "https://output.example/media";
const image = { fileId: "file", versionId: "version", url: outputUrl, contentType: "image/jpeg", size: 100,
  media: { kind: "image", width: 600, height: 800, orientation: 1 } };
const video = { ...image, contentType: "video/mp4", size: 1000000,
  media: { kind: "video", width: 1920, height: 1080, durationSeconds: 60, audio: null } };
const sdk = { task: d => d, logger: { info() {}, warn() {}, error() {} }, tasks: {
  triggerAndWait: async (id, payload) => {
    children.push({ id, payload });
    if (scenario.endsWith("failure")) return { ok: false, error: { message: "failed" } };
    if (id === "process-post-medium") return { ok: true, output: { ...payload.medium, url: outputUrl, type: "video", thumbnail_url: "" } };
    if (id === "ffmpeg-process-video") return { ok: true, output: { ...payload.medium, url: outputUrl + "/normalized" } };
    if (id === "transform-live-image") return { ok: true, output: { ...image, url: outputUrl, signedUrl: outputUrl, width: 600, height: 800, mimeType: "image/jpeg" } };
    if (id === "transform-instagram-image") return { ok: true, output: { signedUrl: outputUrl, width: 600, height: 800 } };
    if (id === "transform-tiktok-image") return { ok: true, output: outputUrl };
    if (id === "transform-buffered-image") return { ok: true, output: { url: outputUrl, mimeType: "image/png", width: 600, height: 800 } };
    throw new Error("Unexpected child " + id);
  }
} };
mock.module("@trigger.dev/sdk", () => sdk);
mock.module("@trigger.dev/sdk/v3", () => sdk);
mock.module("./live-media-runtime", () => ({ liveMediaExecutor: () => {
  if (scenario.startsWith("legacy")) throw new Error("Legacy must not initialize Zenith");
  return async (stage, id, job) => { calls.push({ stage, id, job }); return scenario === "localize" ? image : video; };
} }));
const context = { ctx: { run: { id: "run" } } };
const medium = { id: "medium", url: sourceUrl, position: 1, type: "video", thumbnail_url: "" };
const legacyRouting = process.env.SCENARIO.startsWith("default-") ? {} : { mediaProcessingBackend: "trigger" };
const forced = scenario.startsWith("forced-") ? { mediaProcessingBackend: "zenith" } : {};
if (scenario === "localize") {
  const { processPostMedium } = await import("./process-post-medium");
  expect(processPostMedium.maxDuration).toBe(1200);
  const result = await processPostMedium.run({ medium }, context);
  expect(result).toMatchObject({ url: outputUrl, stored: image, mediaProcessingBackend: "zenith" });
  expect(calls.map(c => c.job.task)).toEqual(["media.localize"]);
} else if (scenario === "normalize" || scenario === "compress" || scenario === "probe") {
  if (scenario === "normalize") {
    const { ffmpegProcessVideo } = await import("./ffmpeg-process-video");
    expect(ffmpegProcessVideo.maxDuration).toBe(1200);
    expect(await ffmpegProcessVideo.run({ medium }, context)).toMatchObject({ url: outputUrl, stored: video, mediaProcessingBackend: "zenith" });
    expect(calls.map(c => c.job.task)).toEqual(["media.localize", "media.transform-video"]);
  } else if (scenario === "compress") {
    const { ffmpegCompressVideo } = await import("./ffmpeg-compress-video");
    expect(ffmpegCompressVideo.maxDuration).toBe(1200);
    expect(await ffmpegCompressVideo.run({ url: sourceUrl, maxSizeBytes: 500000 }, context)).toBe(outputUrl);
    expect(calls).toHaveLength(4);
    expect(calls[1].job.output.video.bitrate).toBe(Math.max(Math.floor(500000 * .9 * 8 / 60), 500000));
  } else {
    const { probeVideoDimensions } = await import("./video-child-tasks");
    expect(probeVideoDimensions.maxDuration).toBe(1200);
    expect(await probeVideoDimensions.run({ url: sourceUrl }, context)).toEqual({ width: 1920, height: 1080 });
    expect(calls.map(c => c.job.task)).toEqual(["media.localize"]);
  }
} else if (scenario.startsWith("legacy-medium")) {
  const { processLiveMedium } = await import("./process-live-medium");
  const input = { medium: { ...medium, ...legacyRouting, skip_processing: scenario.endsWith("skip") } };
  if (scenario.endsWith("failure")) await expect(processLiveMedium.run(input, context)).rejects.toThrow();
  else {
    const result = await processLiveMedium.run(input, context);
    expect(result.mediaProcessingBackend).toBe("trigger");
    expect(children.map(c => c.id)).toEqual(scenario.endsWith("skip") ? ["process-post-medium"] : ["process-post-medium", "ffmpeg-process-video"]);
  }
} else if (scenario.startsWith("legacy-image")) {
  const platform = scenario.split(":")[1];
  const skipProcessing = scenario.startsWith("legacy-image-skip");
  const { transformLiveImageTask } = await import("./transform-live-image");
  expect(transformLiveImageTask.maxDuration).toBe(1200);
  const result = await transformLiveImageTask.run({ url: sourceUrl, platform, skipProcessing, ...legacyRouting }, context);
  expect(result).toMatchObject({ url: outputUrl });
  expect(children[0].id).toBe(skipProcessing ? "transform-buffered-image" : platform === "instagram" ? "transform-instagram-image" : platform.startsWith("tiktok") ? "transform-tiktok-image" : "transform-buffered-image");
  if (skipProcessing) {
    expect(children[0].payload.skipProcessing).toBe(true);
    expect(result.mimeType).toBe("image/png");
  }
} else {
  const platform = scenario.replace("forced-", "");
  if (platform === "instagram") {
    const { transformInstagramImage } = await import("./transform-instagram-image");
    const limits = { minAspectRatio: .5, maxAspectRatio: 2, storiesMinAspectRatio: .6, reelsMinAspectRatio: .7, maxFileSize: 123 };
    expect(await transformInstagramImage.run({ signedUrl: sourceUrl, limits, ...forced }, context)).toEqual({ signedUrl: outputUrl, width: 600, height: 800 });
    expect(children[0].payload.instagramLimits).toEqual(limits);
  } else if (platform === "tiktok") {
    const { transformTikTokImage } = await import("./transform-tiktok-image");
    const limits = { maxFileSize: 123, allowedAspectRatios: [{ ratio: 1, width: 100, height: 100 }] };
    expect(await transformTikTokImage.run({ signedUrl: sourceUrl, platform, ...limits, ...forced }, context)).toBe(outputUrl);
    expect(children[0].payload.tiktokLimits).toEqual(limits);
  } else {
    const { transformBufferedImage } = await import("./transform-buffered-image");
    expect(await transformBufferedImage.run({ url: sourceUrl, platform, ...forced }, context)).toMatchObject({ url: outputUrl });
  }
  expect(children[0].id).toBe("transform-live-image");
  expect(children[0].payload.mediaProcessingBackend).toBe("zenith");
}
for (const child of children) if (scenario.startsWith("legacy")) expect(child.payload.mediaProcessingBackend || child.payload.medium.mediaProcessingBackend).toBe("trigger");
`;

for (const scenario of ["localize", "normalize", "compress", "probe", "instagram", "tiktok", "twitter", "bluesky",
  "forced-instagram", "forced-tiktok", "forced-twitter", "forced-bluesky", "legacy-medium", "legacy-medium-skip", "legacy-medium-failure",
  "legacy-image:instagram", "legacy-image:tiktok", "legacy-image:tiktok_business", "legacy-image:twitter", "legacy-image:bluesky",
  "legacy-image-skip:instagram", "legacy-image-skip:tiktok", "legacy-image-skip:bluesky",
  "default-medium", "default-image:instagram", "default-image:tiktok", "default-image:twitter", "default-image:bluesky"]) {
  test(`individual media task routing: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname,
      env: { ...process.env, SCENARIO: scenario, ZENITH_MEDIA_PERCENTAGE: scenario.startsWith("default-") ? "" : scenario.startsWith("forced-") ? "0" : "100", MEDIA_SERVER_REDIS_URL: "" },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}
