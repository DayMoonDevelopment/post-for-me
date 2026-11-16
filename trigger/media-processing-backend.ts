import { createHash } from "node:crypto";

export type MediaProcessingBackend = "trigger" | "zenith";
export type MediaProcessingRouting = { mediaProcessingBackend?: MediaProcessingBackend };

export function zenithMediaPercentage(value = process.env.ZENITH_MEDIA_PERCENTAGE): number {
  const percentage = Number(value);
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100 ? percentage : 0;
}

/** Inherit a parent's decision; otherwise sample a stable post/media/operation key, never a run ID. */
export function resolveMediaProcessingBackend(key: string, backend?: MediaProcessingBackend): MediaProcessingBackend {
  if (backend === "trigger" || backend === "zenith") return backend;
  const bucket = createHash("sha256").update(key).digest().readUInt32BE(0) / 0x100000000 * 100;
  return bucket < zenithMediaPercentage() ? "zenith" : "trigger";
}
