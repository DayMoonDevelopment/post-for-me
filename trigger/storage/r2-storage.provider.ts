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

    const { size: fileSize } = await stat(filePath);
    const totalParts = Math.ceil(fileSize / PART_SIZE);
    const uploadedPartNumbers = new Set(completedParts.map((p) => p.PartNumber));

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      if (uploadedPartNumbers.has(partNumber)) continue;

      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, fileSize);

      const response = await this.client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: createReadStream(filePath, { start, end: end - 1 }),
          ContentLength: end - start,
        }),
      );

      completedParts.push({ PartNumber: partNumber, ETag: response.ETag! });
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

  getPublicUrl(_bucket: string, key: string): string {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
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
