import { Server } from '@tus/server';
import { S3Store } from '@tus/s3-store';
import type { ConfigService } from '@nestjs/config';
import type { Request as ExpressRequest } from 'express';

import { getMediaBucket } from '../../constants/media.constants';
import type { RequestUser } from '../../auth/user.interface';
import { TUS_UPLOAD_PATH } from './tus-upload-path';

export { TUS_UPLOAD_PATH };

// R2 requires all non-final multipart parts to be exactly the same size;
// setting partSize === minPartSize is @tus/s3-store's documented way to
// enforce that.
const TUS_PART_SIZE_BYTES = 8 * 1024 * 1024;

const TUS_MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

// Abandoned uploads (client never resumes) are reclaimed by the
// `tus-upload-cleanup` trigger.dev job, which calls S3Store#deleteExpired()
// on a cron. That method aborts the underlying R2 multipart upload, not
// just this store's bookkeeping.
const TUS_UPLOAD_EXPIRATION_MS = 24 * 60 * 60 * 1000;

type RequestWithNodeRuntime = {
  runtime?: { node?: { req: ExpressRequest & { user?: RequestUser } } };
};

function getRequestUser(req: RequestWithNodeRuntime): RequestUser | undefined {
  return req.runtime?.node?.req.user;
}

// @tus/server reads `status_code`/`body` off whatever is thrown to shape the
// HTTP error response (see its own `ERRORS` constants, which use the same
// plain shape) — this just gives that contract a real Error subclass so it
// satisfies our lint rule against throwing non-Error values.
class TusRequestError extends Error {
  readonly status_code: number;
  readonly body: string;

  constructor(status_code: number, body: string) {
    super(body);
    this.name = 'TusRequestError';
    this.status_code = status_code;
    this.body = body;
  }
}

export function createTusServer(configService: ConfigService): Server {
  const bucket = getMediaBucket(configService);

  const s3Store = new S3Store({
    partSize: TUS_PART_SIZE_BYTES,
    minPartSize: TUS_PART_SIZE_BYTES,
    expirationPeriodInMilliseconds: TUS_UPLOAD_EXPIRATION_MS,
    // R2 doesn't support S3 object tagging (`x-amz-tagging`), which
    // @tus/s3-store sends by default to mark its `.info` metadata objects
    // Tus-Completed=true/false whenever expiration is configured. That 500s
    // on every request against R2. deleteExpired() (used by the
    // tus-upload-cleanup job) determines expiry via listMultipartUploads'
    // `Initiated` timestamp, not these tags, so disabling them doesn't
    // affect cleanup.
    useTags: false,
    s3ClientConfig: {
      bucket,
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    },
  });

  // Uses @tus/server's default in-process MemoryLocker — safe only because
  // this service is assumed to run as a single replica. api/railway.json
  // pins numReplicas: 1, but the primary prod deploy target is Unkey, whose
  // replica count isn't visible in this repo. CONFIRM Unkey runs this
  // service at 1 replica before merging; if that ever changes, this needs
  // a real distributed locker (e.g. a Redis-backed one) or concurrent
  // PATCH/HEAD/DELETE on the same upload id can corrupt offset tracking.
  return new Server({
    path: TUS_UPLOAD_PATH,
    datastore: s3Store,
    maxSize: TUS_MAX_UPLOAD_SIZE_BYTES,
    // Our upload ids are `${projectId}/${hash}` (contain a slash), but
    // @tus/server's default id extraction (`/([^/]+)\/?$/`) only recovers the
    // last path segment — it would silently drop the projectId prefix on
    // every HEAD/PATCH/DELETE after creation, breaking both resumability and
    // the onIncomingRequest ownership check below. Recover the full
    // remainder after the mount path instead.
    getFileIdFromRequest: (req) => {
      const { pathname } = new URL(req.url);
      const prefix = `${TUS_UPLOAD_PATH}/`;
      return pathname.startsWith(prefix)
        ? decodeURIComponent(pathname.slice(prefix.length))
        : undefined;
    },
    namingFunction: (_req, metadata) => {
      const key = metadata?.key;
      if (!key) {
        throw new TusRequestError(
          400,
          'Missing required `key` in Upload-Metadata. Call POST /v1/media/create-upload-url first to obtain a key.\n',
        );
      }
      return key;
    },
    // Runs for every verb (POST/HEAD/PATCH/DELETE/GET) with the upload id —
    // for POST, `id` is whatever namingFunction just returned. This is the
    // single choke point that both (a) confirms a freshly-created upload's
    // client-supplied key actually belongs to the caller's project, and
    // (b) prevents one team from resuming/inspecting/deleting another
    // team's in-progress upload by guessing/observing an upload id.
    onIncomingRequest: async (req, id) => {
      const user = getRequestUser(req as RequestWithNodeRuntime);
      if (!user?.projectId || !id.startsWith(`${user.projectId}/`)) {
        throw new TusRequestError(403, 'Forbidden\n');
      }

      // R2 requires all non-final multipart parts to be exactly
      // TUS_PART_SIZE_BYTES. Without this check a client using the wrong
      // chunk size would have every PATCH succeed individually and only
      // fail on R2's CompleteMultipartUpload at the very end, discarding
      // the whole transferred upload.
      if (req.method === 'PATCH') {
        const upload = await s3Store.getUpload(id);
        const contentLength = Number(req.headers.get('content-length'));
        const remaining = (upload.size ?? 0) - upload.offset;
        const isFinalChunk = remaining <= TUS_PART_SIZE_BYTES;

        if (!isFinalChunk && contentLength !== TUS_PART_SIZE_BYTES) {
          throw new TusRequestError(
            400,
            `Chunk size must be exactly ${TUS_PART_SIZE_BYTES} bytes for all non-final chunks (R2 multipart requirement). Got ${contentLength}.\n`,
          );
        }
      }
    },
  });
}
