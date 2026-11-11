import { AbortTaskRunError, logger, task, tags, wait } from "@trigger.dev/sdk";
import { coordinateShadowMedia, SHADOW_MAX_DURATION_SECONDS, type ShadowPost } from "./media-shadow-coordinator";
import { createMediaServerTransport } from "./media-server";

export const mediaShadow = task({
  id: "media-shadow",
  maxDuration: SHADOW_MAX_DURATION_SECONDS,
  retry: { maxAttempts: 1 },
  machine: "small-1x",
  run: async (payload: ShadowPost, { ctx }) => {
    const redisUrl = process.env.MEDIA_SERVER_REDIS_URL;
    if (!redisUrl) return { status: "disabled" };
    await tags.add([payload.postId, payload.projectId]);
    const summary = await coordinateShadowMedia(payload, ctx.run.id, {
      transport: createMediaServerTransport(redisUrl),
      wait: {
        createToken: (options) => wait.createToken(options),
        forToken: (token) => wait.forToken<unknown>(token),
      },
      now: Date.now,
      log: (level, message, data) => logger[level](message, data),
    });
    if (summary.status !== "completed") throw new AbortTaskRunError(`Shadow media processing ${summary.status}; see final job summary`);
    return summary;
  },
});
