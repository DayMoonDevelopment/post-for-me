import { Server } from '@tus/server';
import { S3Store } from '@tus/s3-store';
import type { ConfigService } from '@nestjs/config';
import type { Request as ExpressRequest } from 'express';

import { getMediaBucket } from '../../constants/media.constants';
import type { RequestUser } from '../../auth/user.interface';

// Must match the final path Nest resolves for MediaTusController once the
// global URI versioning prefix (VersioningType.URI, defaultVersion: '1') is
// applied — @tus/server uses this to strip the prefix off incoming request
// paths and recover the upload id.
export const TUS_UPLOAD_PATH = '/v1/media/tus';

// R2 requires all non-final multipart parts to be exactly the same size;
// setting partSize === minPartSize is @tus/s3-store's documented way to
// enforce that.
const TUS_PART_SIZE_BYTES = 8 * 1024 * 1024;

const TUS_MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

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
    onIncomingRequest: (req, id) => {
      const user = getRequestUser(req as RequestWithNodeRuntime);
      if (!user?.projectId || !id.startsWith(`${user.projectId}/`)) {
        throw new TusRequestError(403, 'Forbidden\n');
      }
      return Promise.resolve();
    },
  });
}
