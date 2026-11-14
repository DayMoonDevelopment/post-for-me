import { logger, tags } from "@trigger.dev/sdk";

/** Tags are observability only and must never interrupt task processing. */
export async function addTagsBestEffort(values: string | string[]): Promise<void> {
  try {
    // Optional tags should not inherit the longer retry budget for critical
    // SDK requests. Server-directed rate-limit waits may exceed this backoff.
    await tags.add(values, {
      retry: {
        maxAttempts: 3,
        minTimeoutInMs: 1_000,
        maxTimeoutInMs: 5_000,
        factor: 2,
        randomize: true,
      },
    });
  } catch (error) {
    logger.warn("Failed to add task tags; continuing without tags", {
      tags: values,
      error,
    });
  }
}
