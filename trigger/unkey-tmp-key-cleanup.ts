import { logger, schedules } from "@trigger.dev/sdk";
import { Unkey } from "@unkey/api";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

const UNKEY_API_ID = process.env.UNKEY_API_ID!;

const TMP_KEY_PREFIX = process.env.TMP_KEY_PREFIX || "pfm_tmp";

export const unkeyTmpKeyCleanup = schedules.task({
  cron: "0 */1 * * *",
  id: "unkey-tmp-key-cleanup",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  machine: "small-1x",
  run: async (payload) => {
    logger.info("Starting Unkey TMP Key Cleanup", { payload });
    const keysToDelete: string[] = [];

    logger.info("Fetching keys from Unkey");
    let cursor: string | undefined = undefined;
    let hasMore = true;
    do {
      const apiKeys = await unkey.apis.listKeys({
        apiId: UNKEY_API_ID,
        limit: 100,
        cursor,
        revalidateKeysCache: true,
      });

      if (apiKeys.data) {
        for (const key of apiKeys.data) {
          if (
            key.start.includes(TMP_KEY_PREFIX) &&
            key.expires &&
            key.expires < Date.now()
          ) {
            keysToDelete.push(key.keyId);
          }
        }

        cursor = apiKeys.pagination?.cursor;
        hasMore = apiKeys.pagination?.hasMore || false;
      }
    } while (hasMore);

    if (keysToDelete.length === 0) {
      logger.info("No expired TMP keys found");
      return;
    }

    logger.info("Expired TMP Keys", { keysToDelete });
    for (const key of keysToDelete) {
      logger.info("Deleting key", { key });
      const result = await unkey.keys.deleteKey({ keyId: key });
      logger.info("Deleted key", { key, result });
    }

    logger.info("Unkey TMP Key Cleanup completed");
  },
});
