import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { PostClient } from "./posting/post-client";
import type { SocialAccount } from "./posting/post.types";

// refresh-account-tokens.ts (the proactive-refresh cron) constructs a
// Supabase client at module scope, so it needs to resolve to something
// construction-time-valid before the module can be imported (no network
// calls happen at import).
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-dummy";

// PFM-1218 companion fix: this file has the identical
// `error: refreshError.message` flattening bug as post-to-platform.ts's
// `handleTokenRefresh`. It doesn't write to social_post_results (only an
// aggregated `errors: string[]` summary used in cron logs), but the same
// platform-error extraction should apply so failures are debuggable instead
// of showing a generic axios message.

let updateEq: ReturnType<typeof mock>;

mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      update: () => ({ eq: updateEq }),
    }),
  }),
}));

let mod: typeof import("./refresh-account-tokens");

beforeAll(async () => {
  mod = await import("./refresh-account-tokens");
});

beforeEach(() => {
  updateEq = mock(async () => ({ error: null }));
});

const account: SocialAccount = {
  provider: "facebook",
  id: "spc_1",
  social_provider_user_name: "test_page",
  access_token: "old_token",
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "page_1",
  social_provider_metadata: null,
};

function makeGraphError({
  status = 400,
  message,
  code,
}: {
  status?: number;
  message: string;
  code?: number;
}) {
  const err: any = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { error: { message, code } } };
  return err;
}

const postClientWith = (
  refreshAccessToken: PostClient["refreshAccessToken"],
): PostClient => ({ refreshAccessToken }) as PostClient;

describe("handleTokenRefresh (proactive refresh cron)", () => {
  test("returns success and the account id when refresh succeeds", async () => {
    const postClient = postClientWith(async () => ({
      access_token: "new_token",
      expires_at: "2026-01-01T00:00:00.000Z",
    }));

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result).toEqual({ success: true, accountId: "spc_1" });
  });

  test("surfaces the platform's message instead of the generic axios message", async () => {
    const postClient = postClientWith(async () => {
      throw makeGraphError({
        status: 400,
        message:
          "Error validating access token: Session has expired and needs to be reconnected",
        code: 190,
      });
    });

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result).toEqual({
      success: false,
      accountId: "spc_1",
      error:
        "Error validating access token: Session has expired and needs to be reconnected",
    });
  });

  test("falls back to the raw message for a network-level failure", async () => {
    const postClient = postClientWith(async () => {
      throw new Error("socket hang up");
    });

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result).toEqual({
      success: false,
      accountId: "spc_1",
      error: "socket hang up",
    });
  });
});
