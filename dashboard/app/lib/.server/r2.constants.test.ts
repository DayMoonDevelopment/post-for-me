import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

const ENV_KEYS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_PUBLIC_URL",
] as const;

const originalEnv: Record<string, string | undefined> = {};

describe("assertR2Config", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  test("throws a descriptive error when R2_ACCESS_KEY_ID is missing", async () => {
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_ENDPOINT = "https://example.r2.cloudflarestorage.com";
    process.env.R2_PUBLIC_URL = "https://media.example.com";

    const { assertR2Config } = await import("./r2.constants");
    expect(() => assertR2Config()).toThrow("R2_ACCESS_KEY_ID is not defined");
  });

  test("throws a descriptive error when R2_PUBLIC_URL is missing", async () => {
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_ENDPOINT = "https://example.r2.cloudflarestorage.com";

    const { assertR2Config } = await import("./r2.constants");
    expect(() => assertR2Config()).toThrow("R2_PUBLIC_URL is not defined");
  });

  test("does not throw when all R2 vars are set", async () => {
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_ENDPOINT = "https://example.r2.cloudflarestorage.com";
    process.env.R2_PUBLIC_URL = "https://media.example.com";

    const { assertR2Config } = await import("./r2.constants");
    expect(() => assertR2Config()).not.toThrow();
  });
});
