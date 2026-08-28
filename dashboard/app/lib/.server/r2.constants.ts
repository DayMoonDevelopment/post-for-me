export const R2_ACCESS_KEY_ID = process.env?.R2_ACCESS_KEY_ID || "";
export const R2_SECRET_ACCESS_KEY = process.env?.R2_SECRET_ACCESS_KEY || "";
export const R2_ENDPOINT = process.env?.R2_ENDPOINT || "";
export const R2_PUBLIC_URL = process.env?.R2_PUBLIC_URL || "";

// Validated lazily (called from R2StorageProvider's constructor) rather than
// at module import time, so importing storage.provider.ts doesn't crash
// environments where R2 is configured but never actually selected.
export function assertR2Config(): void {
  if (!R2_ACCESS_KEY_ID || R2_ACCESS_KEY_ID.trim() === "") {
    throw new Error("R2_ACCESS_KEY_ID is not defined");
  }

  if (!R2_SECRET_ACCESS_KEY || R2_SECRET_ACCESS_KEY.trim() === "") {
    throw new Error("R2_SECRET_ACCESS_KEY is not defined");
  }

  if (!R2_ENDPOINT || R2_ENDPOINT.trim() === "") {
    throw new Error("R2_ENDPOINT is not defined");
  }

  if (!R2_PUBLIC_URL || R2_PUBLIC_URL.trim() === "") {
    throw new Error("R2_PUBLIC_URL is not defined");
  }
}
