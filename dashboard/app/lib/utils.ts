import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import isArray from "lodash/isArray";
import isPlainObject from "lodash/isPlainObject";
import isUndefined from "lodash/isUndefined";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Values the caller considers “garbage”.
 * Tweak as you wish (e.g. keep 0 or false).
 */
const isFalsy = (v: unknown) =>
  v === undefined ||
  v === null ||
  v === "" ||
  v === false ||
  v === 0 ||
  Number.isNaN(v);

/**
 * Recursively remove
 *   • falsy primitives        (per `isFalsy`)
 *   • empty arrays / objects  (after children are cleaned)
 *
 * Returns `undefined` when the entire branch is pruned so the
 * parent can decide whether to keep or drop it.
 */
export function deepClean<T>(input: T): T {
  // ─── arrays ────────────────────────────────────────────────
  if (isArray(input)) {
    const cleaned = input.map(deepClean).filter((v) => !isUndefined(v)); // drop pruned leafs

    return cleaned.length
      ? (cleaned as unknown as T)
      : (undefined as unknown as T);
  }

  // ─── plain objects ─────────────────────────────────────────
  if (isPlainObject(input)) {
    const entries = Object.entries(input as Record<string, unknown>)
      .map(([k, v]) => [k, deepClean(v)] as const)
      .filter(([, v]) => !isUndefined(v)); // keep only living branches

    if (entries.length === 0) return undefined as unknown as T;

    return Object.fromEntries(entries) as unknown as T;
  }

  // ─── primitives ────────────────────────────────────────────
  return isFalsy(input) ? (undefined as unknown as T) : input;
}

export const getProviderLabel = (provider: string) => {
  const labels: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    x: "X (Twitter)",
    bluesky: "Bluesky",
    pinterest: "Pinterest",
    linkedin: "LinkedIn",
    threads: "Threads",
    tiktok: "TikTok",
    tiktok_business: "TikTok Business",
    instagram_w_facebook: "Instagram (Facebook Login)",
  };
  return labels[provider] || provider;
};
