import { describe, expect, test } from "bun:test";
import { coordinateShadowMedia, SHADOW_TOKEN_TIMEOUT, SHADOW_VIDEO_TOKEN_TIMEOUT, type ShadowPost, type WaitpointApi } from "./media-shadow-coordinator";
import {
  mediaServerSubmission, sanitizeMediaServerLog, type MediaServerCallback, type MediaServerHandle, type MediaServerJob, type MediaServerTokenOutput,
} from "./media-server";
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
  callback: MediaServerCallback;
  response: StoredMedia;
};
type Outcome = MediaServerTokenOutput | "timeout" | "malformed";

function harness(options: {
  localize?: (url: string) => StoredMedia;
  result?: (entry: Entry) => StoredMedia;
  outcome?: (entry: Entry) => Outcome | undefined;
  rejectBeforeAdd?: (attempt: number) => boolean;
} = {}) {
  const entries: Entry[] = [];
  const enqueueAttempts: { handle: MediaServerHandle; job: MediaServerJob; callback: MediaServerCallback }[] = [];
  const tokens: { options: Parameters<WaitpointApi["createToken"]>[0]; id: string; url: string }[] = [];
  const artifacts = new Map<string, StoredMedia>();
  const logs: { level: string; message: string; data: Record<string, unknown> }[] = [];
  let clock = 0;
  let activeWaits = 0;
  let overlappingWaits = 0;
  const deps = {
    now: () => clock,
    log: (level: "info" | "warn" | "error", message: string, data: Record<string, unknown>) => {
      logs.push({ level, message, data: structuredClone(data) });
    },
    wait: {
      async createToken(tokenOptions: Parameters<WaitpointApi["createToken"]>[0]) {
        const id = `waitpoint_${tokens.length + 1}`;
        const token = { options: tokenOptions, id, url: `https://trigger.example/api/v1/waitpoints/tokens/${id}/callback/secret-hash-${id}` };
        tokens.push(token);
        return { id, url: token.url };
      },
      // Mirrors Trigger's runtime, which throws when waits overlap.
      async forToken(token: { id: string }) {
        if (activeWaits++ > 0) overlappingWaits++;
        try {
          await new Promise((resolve) => setImmediate(resolve));
          clock += 1000;
          const url = tokens.find((item) => item.id === token.id)!.url;
          const entry = entries.find((item) => item.callback.url === url);
          const outcome = entry ? options.outcome?.(entry) : "timeout";
          if (!entry || outcome === "timeout") return { ok: false as const, error: new Error("Timed out waiting for waitpoint") };
          if (outcome === "malformed") return { ok: true as const, output: "nonsense" };
          return { ok: true as const, output: outcome ?? { ok: true, output: entry.response } };
        } finally {
          activeWaits--;
        }
      },
    },
    transport: {
      async enqueue(handle: MediaServerHandle, job: MediaServerJob, callback: MediaServerCallback) {
        const identity = { jobId: handle.jobId, requestId: handle.requestId, queue: handle.queue, path: handle.path };
        enqueueAttempts.push({ handle: identity, job: structuredClone(job), callback });
        if (options.rejectBeforeAdd?.(enqueueAttempts.length)) throw new Error("Enqueue failed before add");
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
        const entry: Entry = { handle: identity, job: structuredClone(job), callback, response };
        response = options.result?.(entry) ?? response;
        entry.response = response;
        entries.push(entry);
        artifacts.set(response.versionId, response);
      },
    },
  };
  return {
    entries, enqueueAttempts, tokens, artifacts, logs, deps,
    overlappingWaits: () => overlappingWaits,
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

  test("submits every video with accept and maxBytes, compliant or not, and records media's decision", async () => {
    const compliant = {
      ...video, container: "mov,mp4,m4a,3gp,3g2,mj2", width: 1080, height: 1920, bitrate: 8000000,
      video: { codec: "h264", profile: null, level: null, pixelFormat: "yuv420p", bitrate: 7800000 },
      audio: { codec: "aac", bitrate: 128000, channels: 2, sampleRate: 48000 },
    } satisfies MediaInfo;
    const decisions = ["unchanged", "copied", "encoded"];
    const h = harness({
      localize: (url) => stored(url.includes("good") ? compliant : video),
      result: (entry) => {
        if (entry.job.task !== "media.transform-video") return entry.response;
        const index = h.entries.length - 3;
        const decision = decisions[index];
        return { ...entry.response, decision, ...(decision === "unchanged"
          ? { fileId: entry.job.source.fileId, versionId: entry.job.source.versionId } : {}) } as StoredMedia;
      },
    });
    const summary = await h.run(post({
      media: ["good", "bad", "also-bad"].map((name, index) => ({ id: name, url: `https://origin.example/${name}`, index })),
      accounts: [],
    }));
    const transforms = h.entries.filter((entry) => entry.job.task === "media.transform-video");
    expect(transforms).toHaveLength(3);
    for (const entry of transforms) {
      expect(entry.job).toMatchObject({
        accept: { containers: ["mp4"], videoCodecs: ["h264", "hevc", "h265"], maxBitrate: 25000000 }, maxBytes: 314572800,
      });
      const { name, data } = mediaServerSubmission(entry.handle, entry.job, entry.callback);
      expect(name).toBe("media.trigger-transform-video");
      expect(Object.keys(data.input).sort()).toEqual(["accept", "maxBytes", "output", "path", "requestId", "source"]);
    }
    expect(summary.videoDecisions).toEqual({ unchanged: 1, copied: 1, encoded: 1 });
    expect(h.logs.filter((log) => log.message === "Shadow video normalization decided").map((log) => log.data.decision).sort())
      .toEqual(["copied", "encoded", "unchanged"]);
    expect(h.logs.some((log) => log.message.includes("source meets requirements"))).toBe(false);
  });

  test("an unchanged result names the source itself, and the Bluesky chain still consumes it", async () => {
    const h = harness({
      localize: () => stored(video, 200_000_000),
      result: (entry) => {
        if (entry.job.task !== "media.transform-video") return entry.response;
        const { fileId, versionId } = entry.job.source;
        const accepted = entry.job.accept !== undefined;
        const size = accepted ? 200_000_000 : entry.job.output.video.preset === "slow" ? 90_000_000 : 150_000_000;
        return { ...entry.response, ...(accepted ? { decision: "unchanged", fileId, versionId } : {}), size } as StoredMedia;
      },
    });
    const summary = await h.run(post({ accounts: [{ id: "b", provider: "bluesky" }] }));
    expect(summary).toMatchObject({ status: "completed", completed: 5, videoDecisions: { unchanged: 1, copied: 0, encoded: 0 } });
    const [localized, normalized, ...passes] = h.entries;
    expect(sourceOf(normalized)).toEqual(sourceOf(localized));
    expect(passes[0].job).toMatchObject({ source: sourceOf(localized), output: { video: { preset: "fast" } } });
    expect(passes[1].job).toMatchObject({ source: sourceOf(passes[0]) });
    expect(summary.artifacts).toHaveLength(h.entries.length - 1);
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

describe("shadow waitpoint tokens", () => {
  test("each branch enqueues the interop job with its input and token URL, under an idempotent token", async () => {
    const h = harness({ localize: (url) => stored(url.includes("thumb") ? image : video, url.includes("thumb") ? 1024 : 20_000_000) });
    const summary = await h.run(post({ media: [{ ...post().media[0], thumbnail_url: "https://origin.example/thumb" }], accounts: [{ id: "ig", provider: "instagram" }] }));
    expect(summary.status).toBe("completed");
    expect(h.entries.map((entry) => mediaServerSubmission(entry.handle, entry.job, entry.callback).name)).toEqual([
      "media.trigger-localize", "media.trigger-localize", "media.trigger-transform-video", "media.trigger-transform-image",
    ]);
    for (const [index, entry] of h.entries.entries()) {
      const submission = mediaServerSubmission(entry.handle, entry.job, entry.callback);
      const { task, ...input } = entry.job;
      expect(task).toBeDefined();
      expect(entry.handle.queue).toBe("trigger-interop");
      expect(submission.data).toEqual({ input: { ...input, requestId: entry.handle.requestId, path: entry.handle.path }, callback: { url: h.tokens[index].url } });
      expect(h.tokens[index].options).toEqual({
        timeout: task === "media.transform-video" ? SHADOW_VIDEO_TOKEN_TIMEOUT : SHADOW_TOKEN_TIMEOUT,
        tags: ["post", "run-123"], idempotencyKey: entry.handle.jobId,
      });
    }
  });

  test("branches in one stage never wait on tokens concurrently", async () => {
    const h = harness();
    const summary = await h.run(post({
      media: Array.from({ length: 6 }, (_, index) => ({ id: `medium-${index}`, url: `https://origin.example/${index}`, index })),
      accounts: [{ id: "ig", provider: "instagram" }, { id: "tt", provider: "tiktok" }],
    }));
    expect(summary).toMatchObject({ status: "completed", failed: 0, incomplete: 0 });
    expect(h.overlappingWaits()).toBe(0);
  });

  test("a failed token output records the branch as failed and continues independent media", async () => {
    const h = harness({ outcome: (entry) => entry.job.task === "media.localize" && entry.job.url.includes("broken")
      ? { ok: false, error: { code: "fetch_failed", message: "worker failed" } } : undefined });
    const summary = await h.run(post({ media: [
      { id: "broken", url: "https://origin.example/broken", index: 0 }, post().media[0],
    ] }));
    expect(summary).toMatchObject({ status: "failed", failed: 1, completed: 2, incomplete: 0, branchErrors: 1 });
    expect(h.logs.some((log) => log.data.error && JSON.stringify(log.data.error).includes("fetch_failed"))).toBe(true);
  });

  test("animated image rejection is reported as an unsupported failed transform", async () => {
    const h = harness({ outcome: (entry) => entry.job.task === "media.transform-image"
      ? { ok: false, error: { code: "unsupported", message: "Animated images are not supported." } } : undefined });
    const summary = await h.run();
    expect(summary).toMatchObject({ status: "failed", completed: 1, failed: 1, unsupported: 1 });
  });

  test("a timed-out token is incomplete, stops its dependents, and is not a failure or an artifact", async () => {
    const h = harness({ outcome: (entry) => entry.job.task === "media.localize" ? "timeout" : undefined });
    const summary = await h.run();
    expect(summary).toMatchObject({ status: "incomplete", incomplete: 1, failed: 0, completed: 0 });
    expect(summary.incompleteJobIds).toEqual([h.entries[0].handle.jobId]);
    expect(h.entries).toHaveLength(1);
    expect(summary.artifacts).toEqual([]);
  });

  test("a timeout in one branch leaves independent branches to finish", async () => {
    const h = harness({ outcome: (entry) => entry.job.task === "media.localize" && entry.job.url.endsWith("/0") ? "timeout" : undefined });
    const summary = await h.run(post({
      accounts: [],
      media: Array.from({ length: 3 }, (_, index) => ({ id: `medium-${index}`, url: `https://origin.example/${index}`, index })),
    }));
    expect(summary).toMatchObject({ status: "incomplete", completed: 2, incomplete: 1 });
  });

  test("enqueue failure before add retries the same handle, job and callback, then completes", async () => {
    const h = harness({ rejectBeforeAdd: (attempt) => attempt === 1 });
    const summary = await h.run();
    expect(summary).toMatchObject({ status: "completed", completed: 2, failed: 0, incomplete: 0 });
    expect(h.enqueueAttempts[1]).toEqual(h.enqueueAttempts[0]);
    expect(h.tokens).toHaveLength(2);
  });

  test("an enqueue that keeps failing fails the branch without waiting on its token", async () => {
    const h = harness({ rejectBeforeAdd: () => true });
    const summary = await h.run();
    expect(summary).toMatchObject({ status: "failed", failed: 1, completed: 0, incomplete: 0, branchErrors: 1 });
    expect(h.enqueueAttempts).toHaveLength(3);
  });

  test.each(["localize", "normalize", "platform"])("invalid %s result stops dependents and is not an artifact", async (stage) => {
    const h = harness({
      localize: () => stored(stage === "normalize" ? video : image),
      outcome: (entry) => {
        const invalid = stage === "localize" ? entry.job.task === "media.localize"
          : stage === "normalize" ? entry.job.task === "media.transform-video" : entry.job.task === "media.transform-image";
        return { ok: true, output: invalid ? { ...entry.response, media: { kind: "image", width: 0 } } : entry.response };
      },
    });
    const summary = await h.run();
    const count = stage === "localize" ? 1 : 2;
    expect(summary).toMatchObject({ status: "failed", failed: 1, completed: count - 1, incomplete: 0 });
    expect(h.entries).toHaveLength(count);
    expect(summary.artifacts).toHaveLength(count - 1);
    expect(h.logs.some((log) => log.message.includes("contract mismatch"))).toBe(true);
  });

  test("a token completed with something other than the contract is a mismatch", async () => {
    const h = harness({ outcome: () => "malformed" });
    expect(await h.run()).toMatchObject({ status: "failed", failed: 1, completed: 0 });
  });

  test("no log contains a callback URL, while requests and responses stay redacted and artifacts retained", async () => {
    const h = harness();
    const summary = await h.run();
    const requests = h.logs.filter((log) => log.message.startsWith("Zenith shadow job request:"));
    expect(requests.map((log) => log.message)).toEqual([
      "Zenith shadow job request: media.localize [localize]",
      "Zenith shadow job request: media.transform-image [instagram/image-q100]",
    ]);
    for (const [index, entry] of h.entries.entries()) {
      expect(requests[index].data.redisJob).toEqual(sanitizeMediaServerLog(mediaServerSubmission(entry.handle, entry.job, entry.callback)));
    }
    expect(requests[0].data.redisJob).toMatchObject({
      name: "media.trigger-localize", data: { input: { url: "[redacted URL]" }, callback: "[redacted callback]" },
    });
    const serialized = JSON.stringify(h.logs);
    for (const secret of ["secret-hash", "trigger.example", "request-secret", "response-secret", "https://"]) expect(serialized).not.toContain(secret);
    expect(summary.artifacts).toEqual(h.entries.map(sourceOf));
  });

  test("matches live behavior by falling back to default media after all account-scoped media fail", async () => {
    const h = harness({ outcome: (entry) => entry.job.task === "media.localize" && entry.job.url.endsWith("account")
      ? { ok: false, error: { code: "unavailable", message: "unavailable" } } : undefined });
    const summary = await h.run(post({ media: [post().media[0], {
      id: "override", url: "https://origin.example/account", provider_connection_id: "ig", index: 1,
    }] }));
    expect(summary.status).toBe("failed");
    const transforms = h.entries.filter((entry) => entry.job.task === "media.transform-image");
    expect(transforms).toHaveLength(1);
    expect(transforms[0].job).toMatchObject({ source: sourceOf(h.entries[0]) });
  });
});
