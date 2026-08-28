import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// The real @aws-sdk/client-s3 package ships deep ESM imports that Vitest's
// default Node resolution can't follow, so we mock it — these tests exercise
// R2StorageProvider's own logic (config validation, URL building), not the
// AWS SDK.
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectsCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

const ENV_KEYS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_PUBLIC_URL",
] as const;

const originalEnv: Record<string, string | undefined> = {};

function clearR2Env() {
  for (const key of ENV_KEYS) delete process.env[key];
}

function setR2Env() {
  process.env.R2_ACCESS_KEY_ID = "test-access-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.R2_ENDPOINT = "https://example.r2.cloudflarestorage.com";
  process.env.R2_PUBLIC_URL = "https://media.example.com";
}

describe("R2StorageProvider", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  test("importing the module does not throw when R2 env vars are unset", async () => {
    clearR2Env();
    await expect(import("./r2-storage.provider")).resolves.toBeDefined();
  });

  test("constructing the provider throws when R2 env vars are unset", async () => {
    clearR2Env();
    const { createStorageProvider } = await import("./r2-storage.provider");
    expect(() => createStorageProvider()).toThrow(
      "R2_ACCESS_KEY_ID is not defined",
    );
  });

  test("getPublicUrl includes the bucket in the returned URL", async () => {
    setR2Env();
    const { createStorageProvider } = await import("./r2-storage.provider");
    const provider = createStorageProvider();

    expect(
      provider.getPublicUrl("social-account-photos", "projects/1/a.jpg"),
    ).toBe("https://media.example.com/social-account-photos/projects/1/a.jpg");
  });

  test("produces different URLs for the same key in different buckets", async () => {
    setR2Env();
    const { createStorageProvider } = await import("./r2-storage.provider");
    const provider = createStorageProvider();

    const mediaUrl = provider.getPublicUrl("post-media", "key.mp4");
    const photoUrl = provider.getPublicUrl("social-account-photos", "key.mp4");

    expect(mediaUrl).not.toBe(photoUrl);
  });
});
