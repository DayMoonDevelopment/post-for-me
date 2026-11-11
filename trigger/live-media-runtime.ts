import { logger, wait } from "@trigger.dev/sdk";
import { createMediaServerTransport } from "./media-server";
import { createLiveMediaExecutor } from "./live-media";

export function liveMediaExecutor(runId: string) {
  const redisUrl = process.env.MEDIA_SERVER_REDIS_URL;
  if (!redisUrl) throw new Error("MEDIA_SERVER_REDIS_URL is required for live media processing");
  return createLiveMediaExecutor(runId, {
    transport: createMediaServerTransport(redisUrl),
    wait: { createToken: (options) => wait.createToken(options), forToken: (token) => wait.forToken<unknown>(token) },
    log: (message, data) => logger.info(message, data),
  });
}
