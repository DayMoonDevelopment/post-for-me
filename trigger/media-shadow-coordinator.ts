import { createHash } from "node:crypto";
import { selectPostMedia } from "./posting/media-selection";
import {
  mediaServerDecision, MEDIA_SERVER_INTEROP_LANE, mediaServerSubmission, parseMediaServerResponse, sanitizeMediaServerLog,
  type MediaServerHandle, type MediaServerJob, type MediaServerTokenOutput, type MediaServerTransport, type MediaServerVideoDecision,
} from "./media-server";
import {
  blueskyVideoOutput, GENERIC_VIDEO_ACCEPT, GENERIC_VIDEO_MAX_BYTES, genericVideoOutput, platformImageRecipe, type StoredMedia,
} from "./media-shadow-recipes";

/** Compute budget in seconds; time spent waiting on tokens does not count against it. */
export const SHADOW_MAX_DURATION_SECONDS = 600;
/** Each token's timeout covers its job's queue wait plus its run on media's side. */
export const SHADOW_VIDEO_TOKEN_TIMEOUT = "30m";
export const SHADOW_TOKEN_TIMEOUT = "10m";
const ENQUEUE_ATTEMPTS = 3;

export type ShadowMedium = {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  thumbnail_timestamp_ms?: number | null;
  provider?: string | null;
  provider_connection_id?: string | null;
  skip_processing?: boolean | null;
  index: number;
};
export type ShadowConfiguration = {
  provider?: string | null;
  provider_connection_id?: string | null;
  provider_data?: { placement?: string; share_to_feed?: boolean } | null;
};
export type ShadowPost = {
  postId: string;
  projectId: string;
  media: ShadowMedium[];
  accounts: { id: string; provider: string }[];
  configurations: ShadowConfiguration[];
};

type JobRecord = MediaServerHandle & {
  task: MediaServerJob["task"];
  stage: string;
  mediumId: string;
  accountId?: string;
  platform?: string;
  status: "incomplete" | "completed" | "failed";
  lastState: string;
  startedAt: number;
  errorCode?: string;
  fileId?: string;
  versionId?: string;
  decision?: string;
};
/** The slice of Trigger's `wait` API the coordinator uses. */
export type WaitpointApi = {
  createToken(options: { timeout: string; tags: string[]; idempotencyKey: string }): Promise<{ id: string; url: string }>;
  forToken(token: { id: string }): PromiseLike<{ ok: true; output: unknown } | { ok: false; error: Error }>;
};
type Dependencies = {
  transport: MediaServerTransport;
  wait: WaitpointApi;
  now: () => number;
  log: (level: "info" | "warn" | "error", message: string, data: Record<string, unknown>) => void;
};

export async function coordinateShadowMedia(post: ShadowPost, runId: string, deps: Dependencies) {
  const startedAt = deps.now();
  const jobs: JobRecord[] = [];
  let branchErrors = 0;
  let unsupported = 0;
  const log = (level: "info" | "warn" | "error", message: string, data: Record<string, unknown>) =>
    deps.log(level, message, sanitizeMediaServerLog({ postId: post.postId, runId, ...data }) as Record<string, unknown>);
  const sourceOf = (source: StoredMedia) => ({ fileId: source.fileId, versionId: source.versionId });
  let activeOperations = 0;
  const pendingOperations: (() => void)[] = [];
  async function redisOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (activeOperations >= 5) await new Promise<void>((resolve) => pendingOperations.push(resolve));
    else activeOperations++;
    try { return await operation(); }
    finally {
      const next = pendingOperations.shift();
      if (next) next();
      else activeOperations--;
    }
  }

  // Trigger rejects overlapping waits, so branches queue here and wait on their tokens one at a time.
  let waitQueue: Promise<unknown> = Promise.resolve();
  function waitForToken(token: { id: string }) {
    const result = waitQueue.then(() => deps.wait.forToken(token));
    waitQueue = result.then(() => {}, () => {});
    return result;
  }

  async function execute(stage: string, mediumId: string, job: MediaServerJob, destination?: { id: string; provider: string }) {
    const requestId = createHash("sha256").update(`${runId}/${stage}/${mediumId}/${destination?.id ?? "shared"}`).digest("hex");
    const record: JobRecord = {
      jobId: `${job.task.replace(".", "-")}/${requestId}`,
      requestId, queue: MEDIA_SERVER_INTEROP_LANE,
      path: `shadow/${runId}/${requestId}`,
      task: job.task,
      stage, mediumId, accountId: destination?.id, platform: destination?.provider,
      status: "incomplete", lastState: "creating-token", startedAt: deps.now(),
    };
    jobs.push(record);
    const label = `${job.task} [${destination ? `${destination.provider}/` : ""}${stage}]`;
    const token = await deps.wait.createToken({
      timeout: job.task === "media.transform-video" ? SHADOW_VIDEO_TOKEN_TIMEOUT : SHADOW_TOKEN_TIMEOUT,
      tags: [post.postId, runId],
      idempotencyKey: record.jobId,
    });
    const callback = { url: token.url };
    const lookupKeys = [{ key: "social_post", refId: post.postId }];
    log("info", `Zenith shadow job request: ${label}`, {
      ...record, tokenId: token.id, redisJob: mediaServerSubmission(record, job, callback, lookupKeys),
    });
    let enqueued = false;
    for (let attempt = 1; attempt <= ENQUEUE_ATTEMPTS && !enqueued; attempt++) {
      try {
        await redisOperation(() => deps.transport.enqueue(record, job, callback, lookupKeys));
        enqueued = true;
      } catch {
        log("warn", "Zenith enqueue failed", { ...record, attempt });
      }
    }
    if (!enqueued) {
      record.status = "failed";
      record.lastState = "enqueue-failed";
      throw new Error("Zenith shadow enqueue failed");
    }
    record.lastState = "enqueued";
    log("info", `Zenith shadow job enqueued: ${label}`, { ...record, tokenId: token.id });

    const result = await waitForToken(token);
    record.lastState = result.ok ? "token-completed" : "token-timed-out";
    const elapsedMs = deps.now() - record.startedAt;
    if (!result.ok) {
      log("error", `Zenith shadow job incomplete: token timed out: ${label}`, { ...record, elapsedMs, tokenId: token.id });
      throw new Error("Zenith shadow token timed out");
    }
    const outcome = result.output as MediaServerTokenOutput | null;
    if (!outcome || typeof outcome !== "object" || (outcome.ok !== true && outcome.ok !== false)) {
      record.status = "failed";
      log("error", "Zenith shadow response contract mismatch", { ...record });
      throw new Error("Zenith shadow response contract mismatch");
    }
    if (!outcome.ok) {
      record.status = "failed";
      record.errorCode = outcome.error?.code;
      log("error", `Zenith shadow job terminal response: ${label}`, { ...record, elapsedMs, error: outcome.error });
      if (job.task === "media.transform-image" && /animated images are not supported/i.test(outcome.error?.message ?? "")) {
        unsupported++;
        log("warn", "Shadow animated image transformation unsupported by Zenith", { ...record });
      }
      throw new Error("Zenith shadow worker failed");
    }
    try {
      const response = parseMediaServerResponse(outcome.output, job.task);
      record.status = "completed";
      record.fileId = response.fileId;
      record.versionId = response.versionId;
      record.decision = mediaServerDecision(outcome.output);
      log("info", `Zenith shadow job terminal response: ${label}`, { ...record, elapsedMs, response: outcome.output });
      return response;
    } catch {
      record.status = "failed";
      log("error", "Zenith shadow response contract mismatch", { ...record });
      throw new Error("Zenith shadow response contract mismatch");
    }
  }

  async function batch<T>(items: T[], operation: (item: T, index: number) => Promise<unknown>) {
    await Promise.all(items.map(async (item, index) => {
      try { await operation(item, index); }
      catch (error) {
        branchErrors++;
        log("warn", "Shadow branch stopped; independent branches will continue", {
          itemIndex: index, reason: error instanceof Error ? error.message : "Unknown shadow error",
        });
      }
    }));
  }

  async function image(source: StoredMedia, medium: ShadowMedium, destination: { id: string; provider: string },
    options: Parameters<typeof platformImageRecipe>[2], role = "image") {
    const recipe = platformImageRecipe(destination.provider, source, options);
    if (!recipe) return source;
    let current = await execute(`${role}-q${recipe.initialQuality}`, medium.id, {
      task: "media.transform-image", source: sourceOf(source), output: recipe.output,
    }, destination);
    for (const quality of [80, 60]) {
      if (quality >= recipe.initialQuality || current.size <= recipe.maxBytes) continue;
      current = await execute(`${role}-q${quality}`, medium.id, {
        task: "media.transform-image", source: sourceOf(current),
        output: { type: "image", format: "jpeg", quality, autoOrient: false, background: "#000000" },
      }, destination);
    }
    if (current.size > recipe.maxBytes) log("warn", "Shadow image exceeds platform size after compression ladder", {
      mediumId: medium.id, accountId: destination.id, size: current.size, maxBytes: recipe.maxBytes,
    });
    return current;
  }

  const localized = new Map<string, StoredMedia>();
  const thumbnails = new Map<string, StoredMedia>();
  const ready = new Map<string, StoredMedia>();
  const ordered = [...post.media].sort((a, b) => a.index - b.index);
  log("info", "Shadow media coordinator started", { mediaCount: ordered.length });
  let stageStarted = deps.now();
  await batch(ordered.flatMap((medium) => [
    { medium, thumbnail: false, url: medium.url },
    ...(medium.thumbnail_url ? [{ medium, thumbnail: true, url: medium.thumbnail_url }] : []),
  ]), async ({ medium, thumbnail, url }) => {
    const result = await execute(thumbnail ? "localize-thumbnail" : "localize", medium.id, { task: "media.localize", url });
    (thumbnail ? thumbnails : localized).set(medium.id, result);
  });
  log("info", "Shadow localization stage finished", { elapsedMs: deps.now() - stageStarted });

  stageStarted = deps.now();
  await batch(ordered.filter((medium) => localized.has(medium.id)), async (medium) => {
    let result = localized.get(medium.id)!;
    if (result.media.kind === "video" && !medium.skip_processing) {
      const source = result;
      result = await execute("normalize-video", medium.id, {
        task: "media.transform-video", source: sourceOf(source), output: genericVideoOutput(source),
        accept: GENERIC_VIDEO_ACCEPT, maxBytes: GENERIC_VIDEO_MAX_BYTES,
      });
      log("info", "Shadow video normalization decided", {
        mediumId: medium.id, decision: mediaServerDecision(result),
        sourceFileId: source.fileId, sourceVersionId: source.versionId,
      });
    }
    ready.set(medium.id, result);
  });
  log("info", "Shadow normalization stage finished", { elapsedMs: deps.now() - stageStarted });

  stageStarted = deps.now();
  await batch(post.accounts, async (account) => {
    const platformConfig = post.configurations.find((config) => config.provider === account.provider);
    const accountConfig = post.configurations.find((config) => config.provider_connection_id === account.id);
    const config = { ...platformConfig?.provider_data, ...accountConfig?.provider_data };
    const selected = selectPostMedia(ordered.filter((medium) => ready.has(medium.id)), account, !!platformConfig)
      .filter((medium) => account.provider === "linkedin" || ready.get(medium.id)!.media.kind !== "document");
    const stories = config.placement === "stories";
    const units = stories ? selected.map((medium) => [medium]) : [selected];
    for (let media of units) {
      if (account.provider === "instagram") media = media.slice(0, 10);
      if (account.provider === "tiktok" || account.provider === "tiktok_business") {
        media = media[0] && ready.get(media[0].id)!.media.kind === "video" ? media.slice(0, 1) : media.slice(0, 32);
      }
      if (account.provider === "bluesky" && media.length > 1) media = media.slice(0, 4);
      if (account.provider === "x" && media.length > 1) media = media.slice(0, 4);
      let firstImage: { width: number; height: number } | undefined;
      // Instagram carousel geometry depends on the completed first image.
      for (const [index, medium] of media.entries()) {
        try {
          const source = ready.get(medium.id)!;
          if (source.media.kind === "image" && !medium.skip_processing) {
            const result = await image(source, medium, account, {
              placement: config.placement, isFeed: true, firstImage: stories ? undefined : firstImage,
            });
            if (index === 0 && result.media.kind === "image") firstImage = { width: result.media.width, height: result.media.height };
          }
          if (source.media.kind === "video") {
            if (account.provider === "instagram" && media.length === 1 &&
              thumbnails.has(medium.id) && !medium.skip_processing) {
              await image(thumbnails.get(medium.id)!, medium, account, {
                placement: config.placement, isFeed: config.share_to_feed ?? false,
              }, "thumbnail");
            }
            if (account.provider === "youtube" && !medium.thumbnail_url && medium.thumbnail_timestamp_ms != null) {
              unsupported++;
              log("warn", "Shadow thumbnail extraction unsupported by Zenith", { mediumId: medium.id, accountId: account.id });
            }
            if (account.provider === "bluesky" && media.length === 1 && source.size > 100_000_000) {
              let current = source;
              const duration = source.media.durationSeconds ?? 0;
              for (let attempt = 1; attempt <= 3 && current.size > 100_000_000; attempt++) {
                current = await execute(`bluesky-video-${attempt}`, medium.id, {
                  task: "media.transform-video", source: sourceOf(current), output: blueskyVideoOutput(current, attempt, duration),
                }, account);
              }
              if (current.size > 100_000_000) log("warn", "Shadow Bluesky video remains oversized after three passes", {
                mediumId: medium.id, accountId: account.id, size: current.size,
              });
            }
          }
        } catch (error) {
          branchErrors++;
          log("warn", "Shadow destination medium failed; continuing remaining media", {
            mediumId: medium.id, accountId: account.id, reason: error instanceof Error ? error.message : "Unknown shadow error",
          });
        }
      }
    }
  });
  log("info", "Shadow platform transformations stage finished", { elapsedMs: deps.now() - stageStarted });

  const incomplete = jobs.filter((job) => job.status === "incomplete");
  for (const job of incomplete) log("error", "Zenith shadow job incomplete at coordinator end", {
    ...job, elapsedMs: deps.now() - job.startedAt,
  });
  const summary = {
    status: incomplete.length ? "incomplete" : branchErrors ? "failed" : "completed",
    elapsedMs: deps.now() - startedAt,
    completed: jobs.filter((job) => job.status === "completed").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    incomplete: incomplete.length, branchErrors, unsupported,
    incompleteJobIds: incomplete.map((job) => job.jobId),
    videoDecisions: Object.fromEntries((["unchanged", "copied", "encoded"] as MediaServerVideoDecision[]).map((decision) => [
      decision, jobs.filter((job) => job.stage === "normalize-video" && job.decision === decision).length,
    ])),
    artifacts: [...new Map(jobs.filter((job) => job.fileId).map(({ fileId, versionId }) => [`${fileId}/${versionId}`, { fileId, versionId }])).values()],
  };
  log(summary.status === "completed" ? "info" : "error", "Shadow media coordinator finished", summary);
  return summary;
}
