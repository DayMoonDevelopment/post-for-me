import {
  S3Client,
  ListObjectsV2Command,
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
  DeleteObjectsCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "stream";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "post-media";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export function getR2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export function getFileKeyFromUrl(
  url: string,
  bucket: string
): string | null {
  const supabaseMatch = url.match(
    new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`)
  );
  if (supabaseMatch) return supabaseMatch[1];

  const r2Prefix = `${R2_PUBLIC_URL}/`;
  if (url.startsWith(r2Prefix)) return url.slice(r2Prefix.length);

  return null;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer | Readable | NodeJS.ReadableStream;
  contentType: string;
}): Promise<string> {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: R2_BUCKET,
      Key: params.key,
      Body: params.body as Readable,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000",
    },
  });
  await upload.done();
  return getR2PublicUrl(params.key);
}

export async function listR2ObjectsOlderThan(
  cutoff: Date
): Promise<Array<{ key: string; lastModified: Date }>> {
  const results: Array<{ key: string; lastModified: Date }> = [];
  let continuationToken: string | undefined;

  do {
    const response: ListObjectsV2CommandOutput = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of response.Contents ?? []) {
      if (obj.Key && obj.LastModified && obj.LastModified < cutoff) {
        results.push({ key: obj.Key, lastModified: obj.LastModified });
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return results;
}

export async function deleteR2Objects(keys: string[]): Promise<void> {
  const BATCH_SIZE = 1000;
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      })
    );
  }
}

export async function abortAbandonedMultipartUploads(
  olderThan: Date,
): Promise<{ aborted: number }> {
  const toAbort: Array<{ key: string; uploadId: string }> = [];
  let keyMarker: string | undefined;
  let uploadIdMarker: string | undefined;

  for (;;) {
    const response = await r2Client.send(
      new ListMultipartUploadsCommand({
        Bucket: R2_BUCKET,
        KeyMarker: keyMarker,
        UploadIdMarker: uploadIdMarker,
      }),
    );

    for (const upload of response.Uploads ?? []) {
      if (
        upload.Key &&
        upload.UploadId &&
        upload.Initiated &&
        upload.Initiated < olderThan
      ) {
        toAbort.push({ key: upload.Key, uploadId: upload.UploadId });
      }
    }

    if (!response.IsTruncated) break;
    keyMarker = response.NextKeyMarker;
    uploadIdMarker = response.NextUploadIdMarker;
  }

  for (const { key, uploadId } of toAbort) {
    await r2Client.send(
      new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  return { aborted: toAbort.length };
}
