import { S3Store } from "@tus/s3-store";
import { logger, schedules } from "@trigger.dev/sdk";
import { MEDIA_BUCKET } from "./constants";

// Must match api/src/media/tus/tus-server.factory.ts's S3Store config —
// deleteExpired() only reclaims uploads whose parts/expiration metadata
// were written with these same settings.
const TUS_PART_SIZE_BYTES = 8 * 1024 * 1024;
const TUS_UPLOAD_EXPIRATION_MS = 24 * 60 * 60 * 1000;

const s3Store = new S3Store({
  partSize: TUS_PART_SIZE_BYTES,
  minPartSize: TUS_PART_SIZE_BYTES,
  expirationPeriodInMilliseconds: TUS_UPLOAD_EXPIRATION_MS,
  s3ClientConfig: {
    bucket: MEDIA_BUCKET,
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  },
});

export const tusUploadCleanup = schedules.task({
  cron: { pattern: "0 */1 * * *", environments: ["PRODUCTION"] },
  id: "tus-upload-cleanup",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  machine: "small-1x",
  run: async (payload) => {
    logger.info("Starting TUS Upload Cleanup", payload);

    // Aborts the underlying R2 multipart upload for each expired TUS
    // upload (not just Store bookkeeping), reclaiming storage from
    // uploads clients started and never resumed or completed.
    const deletedCount = await s3Store.deleteExpired();

    logger.info("TUS upload cleanup completed", { deletedCount });
  },
});
