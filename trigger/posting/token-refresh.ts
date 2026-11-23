import { differenceInDays } from "date-fns";
import type { SocialAccount } from "./post.types";

export const X_OAUTH2_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function shouldRefreshToken(
  account: SocialAccount,
  now = new Date(),
): boolean {
  if (
    account.provider === "x" &&
    account.social_provider_metadata?.connection_type === "oauth2"
  ) {
    return (
      !account.access_token_expires_at ||
      new Date(account.access_token_expires_at).getTime() <=
        now.getTime() + X_OAUTH2_REFRESH_BUFFER_MS
    );
  }

  return (
    ["youtube", "bluesky"].includes(account.provider) ||
    differenceInDays(account.access_token_expires_at || now, now) <= 7
  );
}
