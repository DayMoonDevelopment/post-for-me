import { describe, expect, test } from "bun:test";
import { coordinateShadowMedia, SHADOW_OBSERVATION_MS, type ShadowPost } from "./media-shadow-coordinator";
import { mediaServerSubmission, sanitizeMediaServerLog, type MediaServerHandle, type MediaServerJob, type MediaServerSnapshot } from "./media-server";
import type { MediaInfo, StoredMedia } from "./media-shadow-recipes";

const image = {
  kind: "image", format: "png", width: 900, height: 2000, orientation: 1, hasAlpha: true,
} satisfies MediaInfo;
const video = {
  kind: "video", container: "webm", width: 3840, height: 2160, rotation: 0,
  durationSeconds: 60, bitrate: 30000000, frameRate: 30,
  video: { codec: "vp9", profile: null, level: null, pixelFormat: "yuv420p", bitrate: 30000000 },
  audio: { codec: "opus", bitrate: 128000, channels: 2, sampleRate: 48000 },
} satisfies MediaInfo;

function stored(media: MediaInfo = image, size = 1024): StoredMedia {
  return {
    fileId: "fixture", versionId: "original", path: "retained/source",
    url: "https://storage.example/source?token=response-secret",
    contentType: media.kind === "video" ? "video/webm" : "image/png", size,
    media: structuredClone(media),
  };
}

function post(overrides: Partial<ShadowPost> = {}): ShadowPost {
  return {
    postId: "post", projectId: "project",
    media: [{ id: "medium", url: "https://origin.example/media?token=request-secret", index: 0 }],
    accounts: [{ id: "ig", provider: "instagram" }], configurations: [], ...overrides,
  };
}

type Entry = {
  handle: MediaServerHandle;
  job: MediaServerJob;
  response: StoredMedia;
  inspections: number;
};

function harness(options: {
  localize?: (url: string) => StoredMedia;
  result?: (entry: Entry) => StoredMedia;
  inspect?: (entry: Entry) => MediaServerSnapshot | Error;
  rejectEnqueue?: (entry: Entry) => boolean;
  rejectBeforeAdd?: (handle: MediaServerHandle, job: MediaServerJob, attempt: number) => boolean;
} = {}) {
  const entries: Entry[] = [];
  const enqueueAttempts: { handle: MediaServerHandle; job: MediaServerJob }[] = [];
  const inspections: MediaServerHandle[] = [];
  const artifacts = new Map<string, StoredMedia>();
  const logs: { level: string; message: string; data: Record<string, unknown> }[] = [];
  const sleeps: number[] = [];
  let clock = 0;
  let tickScheduled = false;
  let sleepers: { at: number; resolve: () => void }[] = [];
  // Drain transport microtasks before advancing to the next shared virtual wakeup.
  function tick() {
    clock = Math.min(...sleepers.map((sleeper) => sleeper.at));
    const due = sleepers.filter((sleeper) => sleeper.at <= clock);
    sleepers = sleepers.filter((sleeper) => sleeper.at > clock);
    tickScheduled = sleepers.length > 0;
    if (tickScheduled) setImmediate(tick);
    for (const sleeper of due) sleeper.resolve();
  }
  const deps = {
    now: () => clock,
    sleep: async (seconds: number) => {
      sleeps.push(seconds);
      await new Promise<void>((resolve) => {
        sleepers.push({ at: clock + seconds * 1000, resolve });
        if (!tickScheduled) {
          tickScheduled = true;
          setImmediate(tick);
        }
      });
    },
    log: (level: "info" | "warn" | "error", message: string, data: Record<string, unknown>) => {
      logs.push({ level, message, data: structuredClone(data) });
    },
    transport: {
      async enqueue(handle: MediaServerHandle, job: MediaServerJob) {
        const identity = { jobId: handle.jobId, requestId: handle.requestId, queue: handle.queue, path: handle.path };
        enqueueAttempts.push({ handle: identity, job: structuredClone(job) });
        if (options.rejectBeforeAdd?.(handle, job, enqueueAttempts.length)) throw new Error("Enqueue failed before add");
        const id = entries.length + 1;
        const source = job.task === "media.localize"
          ? (options.localize?.(job.url) ?? stored())
          : artifacts.get(job.source.versionId);
        if (!source) throw new Error("Dependent job did not consume a retained artifact");
        let response = structuredClone(source);
        response.fileId = job.task === "media.localize" ? `file-${id}` : source.fileId;
        response.versionId = `version-${id}`;
        response.path = `${handle.path}/${response.versionId}`;
        if (job.task === "media.transform-image") {
          response.media = {
            ...image, format: "jpeg", orientation: 1, hasAlpha: false,
            width: job.output.resize?.width ?? (source.media.kind === "image" ? source.media.width : 900),
            height: job.output.resize?.height ?? (source.media.kind === "image" ? source.media.height : 1200),
          };
          Object.assign(response, { decision: "transformed", contentType: "image/jpeg" });
        } else if (job.task === "media.transform-video") {
          response.media = {
            ...structuredClone(video), container: "mp4", ...job.output.video.scale,
            video: { codec: "h264", profile: "High", level: 40, pixelFormat: "yuv420p", bitrate: 8000000 },
            audio: job.output.audio === null ? null : {
              codec: "aac", bitrate: job.output.audio.bitrate ?? 128000,
              channels: job.output.audio.channels ?? 2, sampleRate: job.output.audio.sampleRate ?? 48000,
            },
          };
          Object.assign(response, { decision: "encoded", contentType: "video/mp4" });
        }
        const entry: Entry = { handle: identity, job: structuredClone(job), response, inspections: 0 };
        response = options.result?.(entry) ?? response;
        entry.response = response;
        entries.push(entry);
        artifacts.set(response.versionId, response);
        if (options.rejectEnqueue?.(entry)) throw new Error("Lost enqueue acknowledgement");
      },
      async inspect(handle: MediaServerHandle): Promise<MediaServerSnapshot> {
        inspections.push({ jobId: handle.jobId, requestId: handle.requestId, queue: handle.queue, path: handle.path });
        const entry = entries.find((item) => item.handle.jobId === handle.jobId);
        if (!entry) return { state: "missing" };
        entry.inspections++;
        const snapshot = options.inspect?.(entry) ?? {
          state: "completed", response: entry.response,
          timestamp: 10, processedOn: 20, finishedOn: 50, attemptsMade: 1,
        };
        if (snapshot instanceof Error) throw snapshot;
        return snapshot;
      },
    },
  };
  return {
    entries, enqueueAttempts, inspections, artifacts, logs, sleeps, deps,
    run: (input = post()) => coordinateShadowMedia(input, "run-123", deps),
  };
}

function sourceOf(entry: Entry) {
  return { fileId: entry.response.fileId, versionId: entry.response.versionId };
}

describe("shadow media coordinator graph", () => {
  test("localizes, normalizes once across accounts, then chains platform video transforms by file/version", async () => {
    const h = harness({
      localize: () => stored(video, 200_000_000),
      result: (entry) => ({ ...entry.response, size: entry.job.task === "media.localize" ? 200_000_000
        : entry.job.task === "media.transform-video" && entry.job.output.video.preset === "fast" ? 90_000_000 : 150_000_000 }),
    });
    const summary = await h.run(post({ accounts: [{ id: "b1", provider: "bluesky" }, { id: "b2", provider: "bluesky" }] }));
    expect(summary).toMatchObject({ status: "completed", completed: 4, failed: 0 });
    const [localized, normalized, ...platform] = h.entries;
    expect(normalized.job).toMatchObject({ task: "media.transform-video", source: sourceOf(localized), output: { video: { preset: "ultrafast" } } });
    expect(platform).toHaveLength(2);
    for (const entry of platform) {
      expect(entry.job).toMatchObject({ task: "media.transform-video", source: sourceOf(normalized), output: { video: { preset: "fast" } } });
    }
    expect(new Set(h.entries.map((entry) => entry.handle.jobId)).size).toBe(4);
    expect(summary.artifacts).toEqual(h.entries.map(sourceOf));
  });

  test("account media wins over platform media, platform needs configuration, otherwise defaults win", async () => {
    const h = harness();
    const summary = await h.run(post({
      media: [
        { id: "default", url: "https://origin.example/default", index: 0 },
        { id: "platform", url: "https://origin.example/platform", provider: "instagram", index: 1 },
        { id: "account", url: "https://origin.example/account", provider_connection_id: "personal", index: 2 },
        { id: "unconfigured", url: "https://origin.example/tiktok", provider: "tiktok", index: 3 },
      ],
      accounts: [{ id: "personal", provider: "instagram" }, { id: "platform", provider: "instagram" }, { id: "fallback", provider: "tiktok" }],
      configurations: [{ provider: "instagram" }],
    }));
    expect(summary.status).toBe("completed");
    const transforms = h.entries.filter((entry) => entry.job.task === "media.transform-image");
    expect(transforms.map((entry) => entry.job.task !== "media.localize" && entry.job.source)).toEqual([
      sourceOf(h.entries[2]), sourceOf(h.entries[1]), sourceOf(h.entries[0]),
    ]);
  });

  test("keeps thumbnail localization and transformation distinct from the video", async () => {
    const h = harness({ localize: (url) => stored(url.includes("thumb") ? image : video) });
    const summary = await h.run(post({ media: [{ ...post().media[0], thumbnail_url: "https://origin.example/thumb" }] }));
    expect(summary.status).toBe("completed");
    const [main, thumbnail, normalized, transformedThumbnail] = h.entries;
    expect(main.handle.jobId).not.toBe(thumbnail.handle.jobId);
    expect(main.handle.path).not.toBe(thumbnail.handle.path);
    expect(normalized.job).toMatchObject({ task: "media.transform-video", source: sourceOf(main) });
    expect(transformedThumbnail.job).toMatchObject({ task: "media.transform-image", source: sourceOf(thumbnail) });
    expect(summary.artifacts).toHaveLength(4);
  });

  test("Instagram carousel uses the completed first result geometry, not source or requested geometry", async () => {
    const h = harness({ result: (entry) => entry.job.task === "media.transform-image" && entry.job.source.versionId === "version-1"
      ? { ...entry.response, media: { ...image, width: 777, height: 888 } } : entry.response });
    const summary = await h.run(post({ media: [post().media[0], { id: "second", url: "https://origin.example/second", index: 1 }] }));
    expect(summary.status).toBe("completed");
    expect(h.entries[2].job).toMatchObject({ output: { resize: { width: 900, height: 1200 } } });
    expect(h.entries[3].job).toMatchObject({ output: { resize: { width: 777, height: 888 } } });
  });

  test("account stories override platform feed placement and do not inherit carousel geometry", async () => {
    const h = harness({ result: (entry) => entry.job.task === "media.transform-image"
      ? { ...entry.response, media: { ...image, width: 777, height: 888 } } : entry.response });
    await h.run(post({
      media: [post().media[0], { id: "second", url: "https://origin.example/second", index: 1 }],
      configurations: [
        { provider: "instagram", provider_data: { placement: "feed" } },
        { provider_connection_id: "ig", provider_data: { placement: "stories" } },
      ],
    }));
    expect(h.entries.slice(2)).toHaveLength(2);
    for (const entry of h.entries.slice(2)) expect(entry.job).toMatchObject({ output: { resize: { width: 900, height: 1600 } } });
  });

  test("100 -> 80 -> 60 compression consumes the previous stored result without repeating crop", async () => {
    const h = harness({ result: (entry) => ({ ...entry.response,
      size: entry.job.task === "media.transform-image" && entry.job.output.quality === 60 ? 1024 : 10 * 1024 * 1024,
    }) });
    const summary = await h.run();
    expect(summary).toMatchObject({ status: "completed", completed: 4 });
    for (const [index, quality] of [100, 80, 60].entries()) {
      expect(h.entries[index + 1].job).toMatchObject({ source: sourceOf(h.entries[index]), output: { quality } });
    }
    for (const entry of h.entries.slice(2)) {
      expect(entry.job).toMatchObject({ output: { autoOrient: false } });
      expect(entry.job.task === "media.transform-image" && entry.job.output.resize).toBeUndefined();
    }
  });

  test("skip_processing still localizes media and thumbnails but skips generic and image transforms", async () => {
    const h = harness({ localize: (url) => stored(url.includes("video") ? video : image) });
    const summary = await h.run(post({ media: [
      { id: "video", url: "https://origin.example/video", thumbnail_url: "https://origin.example/thumb", index: 0, skip_processing: true },
      { id: "image", url: "https://origin.example/image", index: 1, skip_processing: true },
    ] }));
    expect(summary).toMatchObject({ status: "completed", completed: 3 });
    expect(h.entries.every((entry) => entry.job.task === "media.localize")).toBe(true);
  });

  test("Bluesky still compresses skipped videos and each of three passes consumes its predecessor", async () => {
    const h = harness({ localize: () => stored(video, 200_000_000), result: (entry) => ({
      ...entry.response, size: entry.job.task === "media.transform-video" && entry.job.output.video.preset === "slow" ? 90_000_000 : 150_000_000,
    }) });
    const summary = await h.run(post({
      media: [{ ...post().media[0], skip_processing: true }], accounts: [{ id: "b", provider: "bluesky" }],
    }));
    expect(summary).toMatchObject({ status: "completed", completed: 4 });
    for (const [index, preset] of ["fast", "medium", "slow"].entries()) {
      expect(h.entries[index + 1].job).toMatchObject({ source: sourceOf(h.entries[index]), output: { video: { preset } } });
    }
  });

  test.each(["bluesky", "tiktok", "tiktok_business"])("%s stories treat every medium independently before video decisions and image caps", async (provider) => {
    const h = harness({
      localize: (url) => url.includes("video") ? stored(video, 200_000_000) : stored(image, 2_000_000),
      result: (entry) => entry.job.task === "media.localize" ? entry.response
        : { ...entry.response, size: entry.job.task === "media.transform-video" ? 90_000_000 : 1024 },
    });
    const summary = await h.run(post({
      accounts: [{ id: "stories", provider }],
      configurations: [{ provider, provider_data: { placement: "stories" } }],
      media: Array.from({ length: 7 }, (_, index) => ({
        id: `story-${index}`, url: `https://origin.example/${index < 2 ? "video" : "image"}-${index}`,
        index, skip_processing: index < 2,
      })),
    }));
    const images = h.entries.filter((entry) => entry.job.task === "media.transform-image");
    const videos = h.entries.filter((entry) => entry.job.task === "media.transform-video");
    expect(summary).toMatchObject({ status: "completed", completed: provider === "bluesky" ? 14 : 12 });
    expect(images).toHaveLength(5);
    for (const [index, entry] of images.entries()) {
      expect(entry.job).toMatchObject({
        source: sourceOf(h.entries[index + 2]),
        output: { quality: provider === "bluesky" ? 80 : 100 },
      });
    }
    expect(videos).toHaveLength(provider === "bluesky" ? 2 : 0);
    for (const [index, entry] of videos.entries()) {
      expect(entry.job).toMatchObject({ source: sourceOf(h.entries[index]), output: { video: { preset: "fast" } } });
    }
  });

  test("X localizes every image but transforms only the first four in media index order", async () => {
    const h = harness({
      localize: () => stored(image, 6 * 1024 * 1024),
      result: (entry) => entry.job.task === "media.localize" ? entry.response : { ...entry.response, size: 1024 },
    });
    const summary = await h.run(post({
      accounts: [{ id: "x", provider: "x" }],
      media: Array.from({ length: 6 }, (_, index) => ({
        id: `image-${index}`, url: `https://origin.example/image-${index}`, index,
      })).reverse(),
    }));
    expect(summary).toMatchObject({ status: "completed", completed: 10 });
    const localized = h.entries.filter((entry) => entry.job.task === "media.localize");
    const transforms = h.entries.filter((entry) => entry.job.task === "media.transform-image");
    expect(localized).toHaveLength(6);
    expect(transforms).toHaveLength(4);
    for (const [index, entry] of transforms.entries()) {
      expect(localized[index].job).toMatchObject({ url: `https://origin.example/image-${index}` });
      expect(entry.job).toMatchObject({ source: sourceOf(localized[index]), output: { quality: 80 } });
    }
  });
});

describe("shadow observation and safety", () => {
  test("animated image rejection is reported as an unsupported failed transform", async () => {
    const h = harness({ inspect: (entry) => entry.job.task === "media.transform-image"
      ? { state: "failed", failedReason: "Animated images are not supported." }
      : { state: "completed", response: entry.response } });
    const summary = await coordinateShadowMedia(post(), "run", h.deps);
    expect(summary).toMatchObject({ status: "failed", completed: 1, failed: 1, unsupported: 1 });
    expect(h.logs.some((log) => log.message === "Shadow animated image transformation unsupported by Zenith")).toBe(true);
  });

  test("failed branch waits for other jobs, continues independent media, and reports failed", async () => {
    const h = harness({ inspect: (entry) => entry.job.task === "media.localize" && entry.job.url.includes("broken")
      ? { state: "failed", failedReason: "worker failed", attemptsMade: 5 }
      : entry.inspections < 3 ? { state: "active" } : { state: "completed", response: entry.response } });
    const summary = await h.run(post({ media: [
      { id: "broken", url: "https://origin.example/broken", index: 0 }, post().media[0],
    ] }));
    expect(summary).toMatchObject({ status: "failed", failed: 1, completed: 2, incomplete: 0, branchErrors: 1 });
    expect(h.entries.slice(1).every((entry) => entry.inspections === 3)).toBe(true);
    expect(h.logs.at(-1)?.data.status).toBe("failed");
  });

  test("delayed/active retries with failedReason are not terminal failures", async () => {
    const h = harness({ inspect: (entry) => entry.inspections < 4
      ? { state: ["waiting", "active", "delayed"][entry.inspections - 1], failedReason: "prior attempt failed", attemptsMade: 2 }
      : { state: "completed", response: entry.response, attemptsMade: 3 } });
    const summary = await h.run();
    expect(summary).toMatchObject({ status: "completed", completed: 2, failed: 0 });
    expect(h.entries.every((entry) => entry.inspections === 4)).toBe(true);
    expect(h.sleeps).toEqual(Array(6).fill(10));
  });

  test("lost enqueue acknowledgement still observes the deterministic known job ID", async () => {
    const h = harness({ rejectEnqueue: () => true });
    expect(await h.run()).toMatchObject({ status: "completed", completed: 2 });
    expect(h.entries.every((entry) => entry.inspections === 1)).toBe(true);
    const warnings = h.logs.filter((log) => log.message.includes("enqueue unconfirmed"));
    expect(warnings.map((log) => log.data.jobId)).toEqual(h.entries.map((entry) => entry.handle.jobId));
    expect(h.entries.every((entry) => entry.handle.requestId.length === 64 && entry.handle.path.startsWith("shadow/run-123/"))).toBe(true);
  });

  test("enqueue failure before add observes missing, retries the same handle and job, then completes", async () => {
    const h = harness({ rejectBeforeAdd: (_handle, _job, attempt) => attempt === 1 });
    const summary = await h.run();
    expect(summary).toMatchObject({ status: "completed", completed: 2, failed: 0, incomplete: 0 });
    expect(h.enqueueAttempts).toHaveLength(3);
    expect(h.enqueueAttempts[1]).toEqual(h.enqueueAttempts[0]);
    expect(h.inspections.slice(0, 2)).toEqual([h.enqueueAttempts[0].handle, h.enqueueAttempts[0].handle]);
    expect(h.entries).toHaveLength(2);
    expect(h.entries[0].handle).toEqual(h.enqueueAttempts[0].handle);
    expect(h.sleeps).toEqual([10]);
  });

  test("a stalled localization does not block later independent localizations beyond the first five", async () => {
    const h = harness({ inspect: (entry) => entry.job.task === "media.localize" && entry.job.url.endsWith("/0")
      ? { state: "active" } : { state: "completed", response: entry.response } });
    const summary = await h.run(post({
      accounts: [],
      media: Array.from({ length: 7 }, (_, index) => ({
        id: `medium-${index}`, url: `https://origin.example/${index}`, index,
      })),
    }));
    expect(summary).toMatchObject({ status: "incomplete", completed: 6, incomplete: 1, notSubmitted: 0 });
    expect(h.entries).toHaveLength(7);
    expect(h.entries.slice(1).every((entry) => entry.inspections === 1)).toBe(true);
    expect(summary.incompleteJobIds).toEqual([h.entries[0].handle.jobId]);
    expect(summary.elapsedMs).toBe(SHADOW_OBSERVATION_MS);
  });

  test("inspection errors are retried without reenqueuing or losing the job", async () => {
    const h = harness({ inspect: (entry) => entry.inspections <= 2
      ? new Error("Redis temporarily unavailable") : { state: "completed", response: entry.response } });
    expect(await h.run()).toMatchObject({ status: "completed", completed: 2 });
    expect(h.entries).toHaveLength(2);
    expect(h.entries.every((entry) => entry.inspections === 3)).toBe(true);
    expect(h.logs.filter((log) => log.message.includes("inspection unavailable"))).toHaveLength(2);
  });

  test.each(["localize", "normalize", "platform"])("invalid %s result stops dependents and is not an artifact", async (stage) => {
    const h = harness({
      localize: () => stored(stage === "normalize" ? video : image),
      inspect: (entry) => {
        const invalid = stage === "localize" ? entry.job.task === "media.localize"
          : stage === "normalize" ? entry.job.task === "media.transform-video" : entry.job.task === "media.transform-image";
        return { state: "completed", response: invalid ? { ...entry.response, media: { kind: "image", width: 0 } } : entry.response };
      },
    });
    const summary = await h.run();
    const count = stage === "localize" ? 1 : 2;
    expect(summary).toMatchObject({ status: "failed", failed: 1, completed: count - 1, incomplete: 0 });
    expect(h.entries).toHaveLength(count);
    expect(summary.artifacts).toHaveLength(count - 1);
    expect(h.logs.some((log) => log.message.includes("contract mismatch"))).toBe(true);
  });

  test("global deadline logs every incomplete ID and submits no jobs after the fake clock expires", async () => {
    const h = harness({ inspect: () => ({ state: "active" }) });
    const summary = await h.run(post({ media: Array.from({ length: 7 }, (_, index) => ({
      id: `medium-${index}`, url: `https://origin.example/${index}`, index,
    })) }));
    expect(summary).toMatchObject({ status: "incomplete", incomplete: 7, notSubmitted: 0, completed: 0 });
    expect(h.entries).toHaveLength(7);
    expect(summary.elapsedMs).toBe(SHADOW_OBSERVATION_MS);
    expect(summary.incompleteJobIds).toEqual(h.entries.map((entry) => entry.handle.jobId));
    const incomplete = h.logs.filter((log) => log.message.includes("job incomplete at coordinator timeout"));
    expect(incomplete.map((log) => log.data.jobId)).toEqual(summary.incompleteJobIds);
    expect(h.logs.filter((log) => log.message.includes("job request"))).toHaveLength(7);
    expect(h.sleeps.every((seconds) => seconds === 10)).toBe(true);
  });

  test("logs redact requests and responses while retaining all stored artifacts without deletion", async () => {
    const h = harness();
    const summary = await h.run();
    const requests = h.logs.filter((log) => log.message.startsWith("Zenith shadow job request:"));
    const responses = h.logs.filter((log) => log.message.startsWith("Zenith shadow job terminal response:"));
    expect(requests).toHaveLength(2);
    expect(responses).toHaveLength(2);
    expect(requests.map((log) => log.message)).toEqual([
      "Zenith shadow job request: media.localize [localize]",
      "Zenith shadow job request: media.transform-image [instagram/image-q100]",
    ]);
    for (const [index, entry] of h.entries.entries()) {
      expect(requests[index].data.redisJob).toEqual(sanitizeMediaServerLog(mediaServerSubmission(entry.handle, entry.job)));
      expect(requests[index].data.task).toBe(entry.job.task);
    }
    expect(requests[0].data.redisJob).toMatchObject({
      name: "media.localize", data: { url: "[redacted URL]" }, options: { attempts: 5 },
    });
    expect(requests[1].data.redisJob).toMatchObject({
      name: "media.transform-image",
      data: { source: sourceOf(h.entries[0]), output: { type: "image", format: "jpeg", quality: 100 } },
    });
    expect(responses[0].data.response).toMatchObject({ url: "[redacted URL]" });
    expect(responses[0].data).toMatchObject({ enqueueToTerminalMs: 40, latestAttemptMs: 30, attemptsMade: 1 });
    const serialized = JSON.stringify(h.logs);
    for (const secret of ["request-secret", "response-secret", "https://"]) expect(serialized).not.toContain(secret);
    expect(h.entries[0].job).toMatchObject({ url: post().media[0].url });
    expect(summary.artifacts).toEqual(h.entries.map(sourceOf));
    expect(h.artifacts.size).toBe(summary.artifacts.length);
    for (const artifact of summary.artifacts) expect(h.artifacts.get(artifact.versionId ?? "")?.fileId).toBe(artifact.fileId);
    expect(h.entries.map((entry) => entry.job.task)).toEqual(["media.localize", "media.transform-image"]);
  });

  test("matches live behavior by falling back to default media after all account-scoped media fail", async () => {
    const h = harness({ inspect: (entry) => entry.job.task === "media.localize" && entry.job.url.endsWith("account")
      ? { state: "failed", failedReason: "unavailable" } : { state: "completed", response: entry.response } });
    const summary = await h.run(post({ media: [post().media[0], {
      id: "override", url: "https://origin.example/account", provider_connection_id: "ig", index: 1,
    }] }));
    expect(summary.status).toBe("failed");
    const transforms = h.entries.filter((entry) => entry.job.task === "media.transform-image");
    expect(transforms).toHaveLength(1);
    expect(transforms[0].job).toMatchObject({ source: sourceOf(h.entries[0]) });
  });
});
