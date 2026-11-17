import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

type MediaUpload = {
  key: string;
  contentType: string;
  cacheControl?: string;
} & (
  | { body: Buffer; filePath?: never }
  | { filePath: string; body?: never }
);

let client: S3Client | undefined;

export async function uploadMedia(options: MediaUpload): Promise<string> {
  const required = [
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
  ] as const;
  for (const name of required) {
    if (!process.env[name]?.trim()) {
      throw new Error(`Missing required media storage variable: ${name}`);
    }
  }

  const publicBase = new URL(process.env.R2_PUBLIC_BASE_URL!);
  const endpoint = new URL(process.env.R2_ENDPOINT!);
  if (
    !["https:", "http:"].includes(publicBase.protocol) ||
    !["https:", "http:"].includes(endpoint.protocol) ||
    publicBase.search || publicBase.hash || publicBase.username || publicBase.password
  ) {
    throw new Error("R2 endpoint and public base URL must be HTTP(S) URLs without public URL credentials, query, or fragment");
  }
  const segments = options.key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid media object key");
  }
  const publicUrl = `${publicBase.href.replace(/\/+$/, "")}/${segments.map(encodeURIComponent).join("/")}`;

  // Initialize only on upload, so token refresh and other DB-only jobs need no R2 credentials.
  client ??= new S3Client({
    endpoint: endpoint.href,
    region: "auto",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const params = {
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: options.key,
    ContentType: options.contentType,
    CacheControl: options.cacheControl ?? "public, max-age=3600",
  };

  if (options.filePath !== undefined) {
    const { size } = await stat(options.filePath);
    const stream = createReadStream(options.filePath);
    try {
      await new Upload({
        client,
        params: { ...params, Body: stream, ContentLength: size },
        queueSize: 2,
        partSize: 8 * 1024 * 1024,
        leavePartsOnError: false,
      }).done();
    } finally {
      stream.destroy();
    }
  } else {
    await client.send(new PutObjectCommand({
      ...params,
      Body: options.body,
      ContentLength: options.body.length,
    }));
  }
  return publicUrl;
}
