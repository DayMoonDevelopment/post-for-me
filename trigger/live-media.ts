import { createHash } from "node:crypto";
import {
  MEDIA_SERVER_INTEROP_LANE, mediaServerSubmission, parseMediaServerResponse, sanitizeMediaServerLog,
  type MediaServerJob, type MediaServerTransport,
} from "./media-server";
import type { WaitpointApi } from "./media-server";
import {
  blueskyVideoOutput, GENERIC_VIDEO_ACCEPT, GENERIC_VIDEO_MAX_BYTES, genericVideoOutput,
  platformImageRecipe, type StoredMedia,
} from "./media-recipes";

export class ZenithWorkerError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

export const storedSource = ({ fileId, versionId }: StoredMedia) => ({ fileId, versionId });

/** One executor per child run. Call sequentially: Trigger does not support overlapping waits. */
export function createLiveMediaExecutor(runId: string, deps: {
  transport: MediaServerTransport;
  wait: WaitpointApi;
  log: (message: string, data: Record<string, unknown>) => void;
}) {
  return async (stage: string, mediumId: string, job: MediaServerJob): Promise<StoredMedia> => {
    const requestId = createHash("sha256").update(`${runId}/${stage}/${mediumId}`).digest("hex");
    const handle = {
      jobId: `${job.task.replace(".", "-")}/${requestId}`, requestId,
      queue: MEDIA_SERVER_INTEROP_LANE, path: `publishing/${runId}/${requestId}`,
    };
    const log = (message: string, data: Record<string, unknown>) => deps.log(message,
      sanitizeMediaServerLog({ runId, stage, mediumId, ...handle, ...data }) as Record<string, unknown>);
    let token: { id: string; url: string };
    try {
      token = await deps.wait.createToken({
        timeout: job.task === "media.transform-video" ? "30m" : "10m",
        tags: [runId], idempotencyKey: handle.jobId,
      });
    } catch {
      log("Zenith media waitpoint creation failed", {});
      throw new Error("Zenith media waitpoint creation failed");
    }
    const callback = { url: token.url };
    log("Zenith media request", { redisJob: mediaServerSubmission(handle, job, callback), tokenId: token.id });
    let enqueued = false;
    for (let attempt = 1; attempt <= 3 && !enqueued; attempt++) {
      try { await deps.transport.enqueue(handle, job, callback); enqueued = true; }
      catch { log("Zenith enqueue failed", { attempt }); }
    }
    if (!enqueued) throw new Error("Zenith media enqueue failed");
    let result;
    try { result = await deps.wait.forToken(token); }
    catch {
      log("Zenith media token wait failed", { tokenId: token.id });
      throw new Error("Zenith media token wait failed");
    }
    if (!result.ok) {
      log("Zenith media token timed out", { tokenId: token.id });
      throw new Error("Zenith media token timed out");
    }
    const outcome = result.output as { ok?: unknown; output?: unknown; error?: { code?: unknown; message?: unknown } } | null;
    if (!outcome || typeof outcome !== "object" || typeof outcome.ok !== "boolean") {
      throw new Error("Invalid Zenith media token response");
    }
    if (!outcome.ok) {
      if (typeof outcome.error?.code !== "string" || typeof outcome.error.message !== "string") {
        throw new Error("Invalid Zenith media worker error");
      }
      log("Zenith media worker failed", { error: outcome.error });
      // Retain the specific worker error for capability fallback, but never leak URLs.
      throw new ZenithWorkerError(outcome.error.code, sanitizeMediaServerLog(outcome.error.message) as string);
    }
    const output = parseMediaServerResponse(outcome.output, job.task);
    log("Zenith media completed", { output });
    return output;
  };
}

export type LiveMediaExecutor = ReturnType<typeof createLiveMediaExecutor>;

export async function normalizeLiveVideo(source: StoredMedia, id: string, execute: LiveMediaExecutor) {
  return execute("normalize-video", id, {
    task: "media.transform-video", source: storedSource(source), output: genericVideoOutput(source),
    accept: GENERIC_VIDEO_ACCEPT, maxBytes: GENERIC_VIDEO_MAX_BYTES,
  });
}

export async function transformLiveImage(source: StoredMedia, id: string, platform: string,
  options: Parameters<typeof platformImageRecipe>[2], execute: LiveMediaExecutor,
  legacyAnimation: () => Promise<StoredMedia>): Promise<StoredMedia> {
  const recipe = platformImageRecipe(platform, source, options);
  if (!recipe) return source;
  try {
    let current = await execute(`image-${platform}-q${recipe.initialQuality}`, id, {
      task: "media.transform-image", source: storedSource(source), output: recipe.output,
    });
    for (const quality of [80, 60]) {
      if (quality >= recipe.initialQuality || current.size <= recipe.maxBytes) continue;
      current = await execute(`image-${platform}-q${quality}`, id, {
        task: "media.transform-image", source: storedSource(current),
        output: { type: "image", format: "jpeg", quality, autoOrient: false, background: "#000000" },
      });
    }
    return current;
  } catch (error) {
    if (error instanceof ZenithWorkerError && /animated images are not supported/i.test(error.message)) {
      return legacyAnimation();
    }
    throw error;
  }
}

export async function prepareLiveBlueskyVideo(source: StoredMedia, id: string, skip: boolean,
  execute: LiveMediaExecutor): Promise<StoredMedia> {
  if (source.media.kind !== "video") throw new Error("Expected Bluesky video metadata");
  let current = source;
  for (let attempt = 1; !skip && attempt <= 3 && current.size > 100_000_000; attempt++) {
    current = await execute(`bluesky-video-${attempt}`, id, {
      task: "media.transform-video", source: storedSource(current),
      output: blueskyVideoOutput(current, attempt, source.media.durationSeconds ?? 0),
    });
  }
  return current;
}
