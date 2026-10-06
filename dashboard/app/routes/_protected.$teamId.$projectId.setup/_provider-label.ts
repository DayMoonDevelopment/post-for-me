import { getProviderLabel } from "~/lib/utils";

export function getSetupProviderLabel(provider: string): string {
  if (provider === "x") {
    return "X (Twitter) OAuth 1.0";
  }

  return getProviderLabel(provider);
}
