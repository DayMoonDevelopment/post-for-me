import { logger } from "@trigger.dev/sdk";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";

// Vendored subset of Zenith's jobs catalogue; keep queue names and payloads in sync.
export type MediaServerImageOutput = {
  type: "image";
  format: "jpeg" | "png" | "webp";
  quality?: number;
  autoOrient?: boolean;
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
    preset?: "ultrafast" | "superfast";
    profile?: "high";
    level?: "4.0";
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

export type MediaServerJob =
  | { task: "media.localize"; url: string }
  | { task: "media.transform-image"; source: string; output: MediaServerImageOutput; maxBytes?: number }
  | { task: "media.transform-video"; source: string; output: MediaServerVideoOutput; maxBytes?: number };

const lanes = {
  "media.localize": "ingest",
  "media.transform-image": "images",
  "media.transform-video": "videos",
} as const;

const ENQUEUE_TIMEOUT_MS = 2500;

export async function enqueueMediaServerJob(origin: string, job: MediaServerJob): Promise<void> {
  const redisUrl = process.env.MEDIA_SERVER_REDIS_URL;
  if (!redisUrl) return;

  let connection: Redis | undefined;
  let queue: Queue | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const requestId = randomUUID();
  const jobId = `${job.task.replace(".", "-")}/${requestId}`;
  const extension = job.task === "media.localize" ? ""
    : job.task === "media.transform-video" ? ".mp4"
    : `.${job.output.format === "jpeg" ? "jpg" : job.output.format}`;
  const path = `shadow/${new Date().toISOString().slice(0, 10)}/${origin}/${requestId}${extension}`;
  const context = { origin, task: job.task, queue: lanes[job.task], jobId, requestId, path };

  try {
    logger.info("Calling media server shadow job", context);
    // A producer must fail fast, unlike a worker's indefinitely retrying connection.
    connection = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      connectTimeout: ENQUEUE_TIMEOUT_MS,
      commandTimeout: ENQUEUE_TIMEOUT_MS,
    });
    connection.on("error", () => {});
    const { task, ...input } = job;
    await Promise.race([
      (async () => {
        await connection!.connect();
        queue = new Queue(lanes[task], { connection: connection!, prefix: "bull" });
        queue.on("error", () => {});
        await queue.add(task, { ...input, requestId, path }, {
          jobId,
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        });
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Media server enqueue timed out")), ENQUEUE_TIMEOUT_MS);
      }),
    ]);
    logger.info("Media server shadow job enqueued", context);
  } catch (error) {
    // Connection errors can contain credentials or signed URLs; do not log their messages.
    logger.warn("Media server shadow enqueue failed; continuing existing processing", {
      ...context,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  } finally {
    if (timeout) clearTimeout(timeout);
    // Do not leave live sockets across Trigger checkpoints or retries.
    connection?.disconnect();
    void queue?.close().catch(() => {});
  }
}
