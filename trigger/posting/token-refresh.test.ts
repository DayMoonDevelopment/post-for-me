import { describe, expect, test } from "bun:test";
import type { SocialAccount } from "./post.types";
import { shouldRefreshToken } from "./token-refresh";

const now = new Date("2026-11-19T12:00:00Z");
const account: SocialAccount = {
  id: "account",
  provider: "x",
  access_token: "access",
  refresh_token: "refresh",
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "user",
  social_provider_user_name: "user",
  social_provider_metadata: { connection_type: "oauth2" },
};

describe("shouldRefreshToken", () => {
  test("does not refresh a healthy X OAuth2 token (including serialized dates)", () => {
    expect(
      shouldRefreshToken(
        {
          ...account,
          access_token_expires_at: new Date(now.getTime() + 6 * 60_000),
        },
        now,
      ),
    ).toBe(false);
    expect(
      shouldRefreshToken(
        {
          ...account,
          access_token_expires_at: "2026-11-19T14:00:00Z" as unknown as Date,
        },
        now,
      ),
    ).toBe(false);
  });

  test("refreshes X OAuth2 tokens at the five minute boundary, expired, or missing", () => {
    for (const offset of [5 * 60_000, 0, -60_000]) {
      expect(
        shouldRefreshToken(
          {
            ...account,
            access_token_expires_at: new Date(now.getTime() + offset),
          },
          now,
        ),
      ).toBe(true);
    }
    expect(shouldRefreshToken(account, now)).toBe(true);
  });

  test("preserves other platforms' refresh policies", () => {
    const inTwoDays = new Date(now.getTime() + 2 * 86400_000);
    const inThirtyDays = new Date(now.getTime() + 30 * 86400_000);
    expect(
      shouldRefreshToken(
        {
          ...account,
          provider: "instagram",
          access_token_expires_at: inTwoDays,
        },
        now,
      ),
    ).toBe(true);
    expect(
      shouldRefreshToken(
        {
          ...account,
          provider: "instagram",
          access_token_expires_at: inThirtyDays,
        },
        now,
      ),
    ).toBe(false);
    for (const provider of ["youtube", "bluesky"] as const) {
      expect(
        shouldRefreshToken(
          { ...account, provider, access_token_expires_at: inThirtyDays },
          now,
        ),
      ).toBe(true);
    }
    expect(
      shouldRefreshToken(
        {
          ...account,
          social_provider_metadata: { connection_type: "oauth1" },
          access_token_expires_at: inTwoDays,
        },
        now,
      ),
    ).toBe(true);
  });
});
