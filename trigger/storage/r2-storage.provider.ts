import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListMultipartUploadsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { readFile, stat, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import type {
  IStorageProvider,
  StorageFile,
  StorageListOptions,
  StorageUploadOptions,
} from "./storage.provider";

class R2StorageProvider implements IStorageProvider {
  private readonly client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  async upload(
    bucket: string,
    key: string,
    data: Buffer | Blob | File,
    options?: StorageUploadOptions,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : data,
        ContentType: options?.contentType,
        CacheControl: options?.cacheControl,
        Metadata: options?.metadata,
      }),
    );
  }

  private stateFilePath(bucket: string, key: string): string {
    const fingerprint = createHash("sha256").update(`${bucket}:${key}`).digest("hex");
    return path.join(os.tmpdir(), `r2-upload-${fingerprint}.json`);
  }

  private async uploadPartWithRetry(
    params: {
      Bucket: string;
      Key: string;
      UploadId: string;
      PartNumber: number;
      filePath: string;
      start: number;
      end: number;
    },
    maxAttempts = 3,
  ): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.send(
          new UploadPartCommand({
            Bucket: params.Bucket,
            Key: params.Key,
            UploadId: params.UploadId,
            PartNumber: params.PartNumber,
            Body: createReadStream(params.filePath, {
              start: params.start,
              end: params.end - 1,
            }),
            ContentLength: params.end - params.start,
          }),
        );
        return response.ETag!;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * 2 ** (attempt - 1)),
          );
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to upload part ${params.PartNumber}`);
  }

  async uploadFromFilePath(
    bucket: string,
    key: string,
    filePath: string,
    contentType: string,
  ): Promise<void> {
    const PART_SIZE = 6 * 1024 * 1024;
    const stateFile = this.stateFilePath(bucket, key);

    let uploadId: string;
    let completedParts: { PartNumber: number; ETag: string }[] = [];

    try {
      const raw = await readFile(stateFile, "utf8");
      const state = JSON.parse(raw) as { uploadId: string };
      const listed = await this.client.send(
        new ListPartsCommand({ Bucket: bucket, Key: key, UploadId: state.uploadId }),
      );
      uploadId = state.uploadId;
      completedParts = (listed.Parts ?? []).map((p) => ({
        PartNumber: p.PartNumber!,
        ETag: p.ETag!,
      }));
    } catch {
      // No valid previous upload — start fresh
      const created = await this.client.send(
        new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      );
      uploadId = created.UploadId!;
      await writeFile(stateFile, JSON.stringify({ uploadId }), "utf8");
    }

    try {
      const { size: fileSize } = await stat(filePath);
      const totalParts = Math.ceil(fileSize / PART_SIZE);
      const uploadedPartNumbers = new Set(completedParts.map((p) => p.PartNumber));

      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        if (uploadedPartNumbers.has(partNumber)) continue;

        const start = (partNumber - 1) * PART_SIZE;
        const end = Math.min(start + PART_SIZE, fileSize);

        const etag = await this.uploadPartWithRetry({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          filePath,
          start,
          end,
        });

        completedParts.push({ PartNumber: partNumber, ETag: etag });
      }

      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: completedParts.sort((a, b) => a.PartNumber - b.PartNumber),
          },
        }),
      );

      await unlink(stateFile).catch(() => {});
    } catch (error) {
      await this.client
        .send(
          new AbortMultipartUploadCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
          }),
        )
        .catch(() => {});
      await unlink(stateFile).catch(() => {});
      throw error;
    }
  }

  async download(bucket: string, key: string): Promise<Blob> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!response.Body) throw new Error(`File not found: ${bucket}/${key}`);
    const bytes = await response.Body.transformToByteArray();
    return new Blob([Buffer.from(bytes)], { type: response.ContentType });
  }

  async remove(bucket: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map((k) => ({ Key: k })) },
      }),
    );
  }

  async list(
    bucket: string,
    prefix?: string,
    options?: StorageListOptions,
  ): Promise<StorageFile[]> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: options?.limit,
      }),
    );
    return (response.Contents ?? []).map((obj) => ({
      name: obj.Key!,
      createdAt: obj.LastModified?.toISOString(),
    }));
  }

  getPublicUrl(bucket: string, key: string): string {
    return `${process.env.R2_PUBLIC_URL}/${bucket}/${key}`;
  }

  async createSignedUploadUrl(bucket: string, key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 3600 },
    );
  }

  async *listAll(bucket: string, prefix?: string): AsyncGenerator<StorageFile> {
    let continuationToken: string | undefined;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of response.Contents ?? []) {
        yield {
          name: obj.Key!,
          createdAt: obj.LastModified?.toISOString(),
        };
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }
}

export function createStorageProvider(): IStorageProvider {
  return new R2StorageProvider();
}

/**
 * Aborts incomplete multipart uploads started before `olderThan`. Failed
 * uploadFromFilePath attempts self-abort, but a crash between
 * CreateMultipartUploadCommand and the try/catch (or an abort call that
 * itself fails) can still leave one behind — this sweep is the backstop.
 */
export async function abortStaleMultipartUploads(
  bucket: string,
  olderThan: Date,
): Promise<number> {
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  let aborted = 0;
  let keyMarker: string | undefined;
  let uploadIdMarker: string | undefined;

  while (true) {
    const response = await client.send(
      new ListMultipartUploadsCommand({
        Bucket: bucket,
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
        await client
          .send(
            new AbortMultipartUploadCommand({
              Bucket: bucket,
              Key: upload.Key,
              UploadId: upload.UploadId,
            }),
          )
          .catch(() => {});
        aborted++;
      }
    }

    if (!response.IsTruncated) break;
    keyMarker = response.NextKeyMarker;
    uploadIdMarker = response.NextUploadIdMarker;
  }

  return aborted;
}
