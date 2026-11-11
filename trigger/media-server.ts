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

type AcceptRange = { min?: number; max?: number };

/** What counts as a video already good enough; vendored from Zenith's `videoAcceptSchema`. */
export type MediaServerVideoAccept = {
  videoCodecs?: string[];
  pixelFormats?: string[];
  maxWidth?: number;
  maxHeight?: number;
  bounds?: { aspectRatio?: AcceptRange; maxWidth: number; maxHeight: number }[];
  aspectRatio?: AcceptRange;
  fps?: AcceptRange;
  maxVideoBitrate?: number;
  maxBitrate?: number;
  audioRequired?: boolean;
  audioCodecs?: string[];
  audioBitrate?: AcceptRange;
  audioChannels?: AcceptRange;
  audioSampleRate?: AcceptRange;
  containers?: string[];
};

type StoredSource = { fileId: string; versionId: string };
export type MediaServerJob =
  | { task: "media.localize"; url: string }
  | { task: "media.transform-image"; source: StoredSource; output: MediaServerImageOutput }
  | {
    task: "media.transform-video";
    source: StoredSource;
    output: MediaServerVideoOutput;
    accept?: MediaServerVideoAccept;
    maxBytes?: number;
  };

/** The BullMQ lane whose coordinators run the real task and complete a Trigger waitpoint token. */
export const MEDIA_SERVER_INTEROP_LANE = "trigger-interop";

export const mediaServerInteropJobs = {
  "media.localize": "media.trigger-localize",
  "media.transform-image": "media.trigger-transform-image",
  "media.transform-video": "media.trigger-transform-video",
} as const;

/** The URL media POSTs a task's outcome to; it completes the waitpoint token and is a secret. */
export type MediaServerCallback = { url: string };

/** What media POSTs to the callback: the real task's output, or a coded error. */
export type MediaServerTokenOutput =
  | { ok: true; output: unknown }
  | { ok: false; error: { code: string; message: string } };

export type MediaServerHandle = {
  jobId: string;
  queue: string;
  requestId: string;
  path: string;
};

export interface MediaServerTransport {
  enqueue(handle: MediaServerHandle, job: MediaServerJob, callback: MediaServerCallback): Promise<void>;
}

const OPERATION_TIMEOUT_MS = 2500;

/** The BullMQ job for a task on the interop lane: the real task's input plus the callback. */
export function mediaServerSubmission(handle: MediaServerHandle, job: MediaServerJob, callback: MediaServerCallback) {
  const { task, ...input } = job;
  return {
    name: mediaServerInteropJobs[task],
    data: { input: { ...input, requestId: handle.requestId, path: handle.path }, callback },
    options: {
      jobId: handle.jobId,
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 3 * 60 * 60 },
      removeOnFail: { age: 3 * 60 * 60 },
    },
  };
}

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
    async enqueue(handle, job, callback) {
      await withQueue(redisUrl, handle.queue, async (queue) => {
        const { name, data, options } = mediaServerSubmission(handle, job, callback);
        await queue.add(name, data, options);
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
    return Object.fromEntries(Object.entries(value).map(([key, item]) =>
      [key, key === "callback" ? "[redacted callback]" : sanitizeMediaServerLog(item)]));
  }
  return value;
}

/** What media did with a source video: kept it, redid only its audio or container, or re-encoded it. */
export type MediaServerVideoDecision = "unchanged" | "copied" | "encoded";

/** The transform's decision, or `undefined` for a result that has none. */
export function mediaServerDecision(response: unknown): string | undefined {
  const decision = (response as { decision?: unknown } | null)?.decision;
  return typeof decision === "string" ? decision : undefined;
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
