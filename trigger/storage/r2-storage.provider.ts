import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
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

  async uploadFromFilePath(
    bucket: string,
    key: string,
    filePath: string,
    contentType: string,
  ): Promise<void> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: contentType,
      },
      partSize: 6 * 1024 * 1024,
      leavePartsOnError: false,
    });
    await upload.done();
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
