import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { StoredMedia } from "./media-shadow-recipes";

// Vendored subset of Zenith's jobs catalogue; no cross-repository imports.
export type MediaServerImageOutput = {
  type: "image";
  format: "jpeg" | "png" | "webp";
  quality?: number;
  autoOrient?: boolean;
  background?: string;
  resize?: {
    width?: number;
    height?: number;
    fit: "inside" | "cover" | "contain" | "fill";
    withoutEnlargement?: boolean;
  };
};

export type MediaServerVideoOutput = {
  type: "video";
  container: "mp4";
  faststart?: boolean;
  video: {
    codec: "h264";
    preset?: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "slower" | "veryslow";
    profile?: "baseline" | "main" | "high";
    level?: "3.0" | "3.1" | "4.0" | "4.1" | "4.2" | "5.0" | "5.1" | "5.2";
    pixelFormat?: "yuv420p";
    crf?: number;
    bitrate?: number;
    maxrate?: number;
    bufsize?: number;
    scale?: { width: number; height: number };
    fps?: number;
  };
  audio: null | {
    codec: "aac";
    bitrate?: number;
    channels?: 1 | 2;
    sampleRate?: 44100 | 48000;
  };
};

type StoredSource = { fileId: string; versionId: string };
export type MediaServerJob =
  | { task: "media.localize"; url: string }
  | { task: "media.transform-image"; source: StoredSource; output: MediaServerImageOutput }
  | { task: "media.transform-video"; source: StoredSource; output: MediaServerVideoOutput };

export const mediaServerLanes = {
  "media.localize": "ingest",
  "media.transform-image": "images",
  "media.transform-video": "videos",
} as const;

export type MediaServerHandle = {
  jobId: string;
  queue: string;
  requestId: string;
  path: string;
};

export type MediaServerSnapshot = {
  state: string;
  response?: unknown;
  failedReason?: string;
  timestamp?: number;
  processedOn?: number;
  finishedOn?: number;
  attemptsMade?: number;
};

export interface MediaServerTransport {
  enqueue(handle: MediaServerHandle, job: MediaServerJob): Promise<void>;
  inspect(handle: MediaServerHandle): Promise<MediaServerSnapshot>;
}

const OPERATION_TIMEOUT_MS = 2500;

async function withQueue<T>(redisUrl: string, name: string, operation: (queue: Queue) => Promise<T>): Promise<T> {
  const connection = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
    enableOfflineQueue: false,
    connectTimeout: OPERATION_TIMEOUT_MS,
    commandTimeout: OPERATION_TIMEOUT_MS,
  });
  connection.on("error", () => {});
  let queue: Queue | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        await connection.connect();
        queue = new Queue(name, { connection, prefix: "bull" });
        queue.on("error", () => {});
        return operation(queue);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Media server operation timed out")), OPERATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    connection.disconnect();
    void queue?.close().catch(() => {});
  }
}

export function createMediaServerTransport(redisUrl: string): MediaServerTransport {
  return {
    async enqueue(handle, job) {
      await withQueue(redisUrl, handle.queue, async (queue) => {
        const { task, ...input } = job;
        await queue.add(task, { ...input, requestId: handle.requestId, path: handle.path }, {
          jobId: handle.jobId,
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          // Keep observed results long enough for the two-hour coordinator even under load.
          removeOnComplete: { age: 3 * 60 * 60 },
          removeOnFail: { age: 3 * 60 * 60 },
        });
      });
    },
    async inspect(handle) {
      return withQueue(redisUrl, handle.queue, async (queue) => {
        const job = await queue.getJob(handle.jobId);
        if (!job) return { state: "missing" };
        const state = await job.getState();
        // Refetch after state: the original snapshot may predate the worker's returnvalue.
        const current = state === "completed" || state === "failed" ? await queue.getJob(handle.jobId) : job;
        if (!current) return { state: "missing" };
        return {
          state,
          response: current.returnvalue,
          failedReason: current.failedReason,
          timestamp: current.timestamp,
          processedOn: current.processedOn,
          finishedOn: current.finishedOn,
          attemptsMade: current.attemptsMade,
        };
      });
    },
  };
}

export function sanitizeMediaServerLog(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/(?:https?|rediss?):\/\/[^\s"'<>]+/gi, "[redacted URL]").slice(0, 4000);
  }
  if (Array.isArray(value)) return value.map(sanitizeMediaServerLog);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeMediaServerLog(item)]));
  }
  return value;
}

export function parseMediaServerResponse(value: unknown, task: MediaServerJob["task"]): StoredMedia {
  const object = (item: unknown): Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid Zenith result object");
    return item as Record<string, unknown>;
  };
  const text = (item: unknown) => typeof item === "string" && item.length > 0;
  const number = (item: unknown) => typeof item === "number" && Number.isFinite(item);
  const positive = (item: unknown) => number(item) && (item as number) > 0;
  const nullableNumber = (item: unknown) => item === null || number(item);
  const result = object(value);
  if (![result.fileId, result.versionId, result.path, result.url, result.contentType].every(text) ||
    !Number.isInteger(result.size) || (result.size as number) < 0) throw new Error("Invalid Zenith stored media result");
  const media = object(result.media);
  if (media.kind === "image") {
    if (!text(media.format) || !positive(media.width) || !positive(media.height) ||
      !Number.isInteger(media.orientation) || (media.orientation as number) < 1 || (media.orientation as number) > 8 ||
      typeof media.hasAlpha !== "boolean") throw new Error("Invalid Zenith image metadata");
  } else if (media.kind === "video") {
    const video = object(media.video);
    if (!text(media.container) || !positive(media.width) || !positive(media.height) ||
      ![0, 90, 180, 270].includes(media.rotation as number) ||
      ![media.durationSeconds, media.bitrate, media.frameRate, video.level, video.bitrate].every(nullableNumber) ||
      !text(video.codec) || !(video.profile === null || text(video.profile)) ||
      !(video.pixelFormat === null || text(video.pixelFormat))) throw new Error("Invalid Zenith video metadata");
    if (media.audio !== null) {
      const audio = object(media.audio);
      if (!text(audio.codec) || ![audio.bitrate, audio.channels, audio.sampleRate].every(nullableNumber)) {
        throw new Error("Invalid Zenith audio metadata");
      }
    }
  } else if (media.kind !== "document" || !text(media.contentType)) throw new Error("Invalid Zenith media kind");
  if (task !== "media.localize") {
    const image = task === "media.transform-image";
    if (media.kind !== (image ? "image" : "video") ||
      !(image ? ["unchanged", "transformed"] : ["unchanged", "copied", "encoded"]).includes(result.decision as string)) {
      throw new Error("Invalid Zenith transform decision");
    }
  }
  return value as StoredMedia;
}
