import { describe, test, expect, spyOn, afterEach } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { S3Client } from "@aws-sdk/client-s3";
import {
  abortStaleMultipartUploads,
  createStorageProvider,
} from "./r2-storage.provider";

process.env.R2_ENDPOINT ||= "https://example.r2.cloudflarestorage.com";
process.env.R2_ACCESS_KEY_ID ||= "test-access-key";
process.env.R2_SECRET_ACCESS_KEY ||= "test-secret-key";
process.env.R2_PUBLIC_URL ||= "https://media.example.com";

async function withTempFile(bytes: number, fn: (filePath: string) => Promise<void>) {
  const filePath = path.join(os.tmpdir(), `r2-provider-test-${Date.now()}-${Math.random()}.bin`);
  await fs.writeFile(filePath, Buffer.alloc(bytes));
  try {
    await fn(filePath);
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
}

describe("R2StorageProvider.getPublicUrl", () => {
  test("includes the bucket in the returned URL", () => {
    const provider = createStorageProvider();
    expect(provider.getPublicUrl("social-account-photos", "projects/1/a.jpg")).toBe(
      "https://media.example.com/social-account-photos/projects/1/a.jpg",
    );
  });

  test("differs per bucket for the same key", () => {
    const provider = createStorageProvider();
    const mediaUrl = provider.getPublicUrl("post-media", "key.mp4");
    const photoUrl = provider.getPublicUrl("social-account-photos", "key.mp4");
    expect(mediaUrl).not.toBe(photoUrl);
  });
});

describe("R2StorageProvider.uploadFromFilePath", () => {
  afterEach(() => {
    // Restore whatever spyOn installed on S3Client.prototype.send between tests.
    (S3Client.prototype.send as unknown as { mockRestore?: () => void }).mockRestore?.();
  });

  test("retries a failed part upload before succeeding", async () => {
    const calls: string[] = [];
    let uploadPartAttempts = 0;

    spyOn(S3Client.prototype, "send").mockImplementation(async (command: any) => {
      const name = command.constructor.name;
      calls.push(name);

      if (name === "ListPartsCommand") throw new Error("no previous upload");
      if (name === "CreateMultipartUploadCommand") return { UploadId: "upload-1" };
      if (name === "UploadPartCommand") {
        uploadPartAttempts += 1;
        if (uploadPartAttempts < 2) throw new Error("transient network error");
        return { ETag: "etag-1" };
      }
      if (name === "CompleteMultipartUploadCommand") return {};
      throw new Error(`Unexpected command: ${name}`);
    });

    const provider = createStorageProvider();

    await withTempFile(10, async (filePath) => {
      await provider.uploadFromFilePath(
        "post-media",
        "retry-success-key",
        filePath,
        "application/octet-stream",
      );
    });

    expect(uploadPartAttempts).toBe(2);
    expect(calls).toContain("CompleteMultipartUploadCommand");
    expect(calls).not.toContain("AbortMultipartUploadCommand");
  }, 10000);

  test("aborts the multipart upload once retries are exhausted", async () => {
    const calls: string[] = [];

    spyOn(S3Client.prototype, "send").mockImplementation(async (command: any) => {
      const name = command.constructor.name;
      calls.push(name);

      if (name === "ListPartsCommand") throw new Error("no previous upload");
      if (name === "CreateMultipartUploadCommand") return { UploadId: "upload-2" };
      if (name === "UploadPartCommand") throw new Error("permanent network error");
      if (name === "AbortMultipartUploadCommand") return {};
      throw new Error(`Unexpected command: ${name}`);
    });

    const provider = createStorageProvider();

    await withTempFile(10, async (filePath) => {
      await expect(
        provider.uploadFromFilePath(
          "post-media",
          "retry-exhausted-key",
          filePath,
          "application/octet-stream",
        ),
      ).rejects.toThrow("permanent network error");
    });

    expect(calls).toContain("AbortMultipartUploadCommand");
    expect(calls).not.toContain("CompleteMultipartUploadCommand");
  }, 10000);
});

describe("abortStaleMultipartUploads", () => {
  afterEach(() => {
    (S3Client.prototype.send as unknown as { mockRestore?: () => void }).mockRestore?.();
  });

  test("aborts only uploads initiated before the cutoff, across pages", async () => {
    const aborted: { Key?: string; UploadId?: string }[] = [];
    const oldDate = new Date("2020-01-01T00:00:00Z");
    const newDate = new Date();

    let call = 0;
    spyOn(S3Client.prototype, "send").mockImplementation(async (command: any) => {
      const name = command.constructor.name;

      if (name === "ListMultipartUploadsCommand") {
        call += 1;
        if (call === 1) {
          return {
            Uploads: [{ Key: "stale-1", UploadId: "u1", Initiated: oldDate }],
            IsTruncated: true,
            NextKeyMarker: "stale-1",
            NextUploadIdMarker: "u1",
          };
        }
        return {
          Uploads: [{ Key: "fresh-1", UploadId: "u2", Initiated: newDate }],
          IsTruncated: false,
        };
      }
      if (name === "AbortMultipartUploadCommand") {
        aborted.push({ Key: command.input.Key, UploadId: command.input.UploadId });
        return {};
      }
      throw new Error(`Unexpected command: ${name}`);
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);

    const count = await abortStaleMultipartUploads("post-media", cutoff);

    expect(count).toBe(1);
    expect(aborted).toEqual([{ Key: "stale-1", UploadId: "u1" }]);
  });
});
