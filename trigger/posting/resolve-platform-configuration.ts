import type { PlatformConfiguration } from "./post.types";

export function resolvePlatformConfiguration(
  platform?: PlatformConfiguration | null,
  account?: PlatformConfiguration | null,
): PlatformConfiguration {
  return { ...platform, ...account };
}
