import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { PostClient } from "./posting/post-client";
import type { SocialAccount } from "./posting/post.types";

// post-to-platform.ts constructs a Supabase client and a Stripe client at
// module scope, so these need to resolve to something construction-time-valid
// before the module can be imported (no network calls happen at import).
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-dummy";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

// PFM-1218: when Instagram token refresh failed (e.g. an expired session,
// OAuthException code 190), `handleTokenRefresh` returned only
// `refreshError.message` — axios's generic "Request failed with status code
// 400" — and the caller never set `details` at all, so the customer saw
// `error_message: "Request failed with status code 400"` and `details: null`
// in social_post_results with no way to tell they needed to reconnect their
// account. These tests cover the fix: the platform's actual structured error
// body now flows through `error`/`details`.

let updateEq: ReturnType<typeof mock>;
let reloadSingle: ReturnType<typeof mock>;
let reloadEq: ReturnType<typeof mock>;

mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      update: () => ({ eq: updateEq }),
      select: () => ({ eq: reloadEq }),
    }),
  }),
}));

let mod: typeof import("./post-to-platform");

beforeAll(async () => {
  mod = await import("./post-to-platform");
});

beforeEach(() => {
  updateEq = mock(async () => ({ error: null }));
  reloadSingle = mock(async () => ({
    data: null,
    error: { message: "reload unavailable" },
  }));
  reloadEq = mock(() => ({ single: reloadSingle }));
  Object.assign(account, {
    access_token: "old_token",
    refresh_token: null,
    access_token_expires_at: null,
    refresh_token_expires_at: null,
  });
});

const account: SocialAccount = {
  provider: "instagram",
  id: "spc_1",
  social_provider_user_name: "test_account",
  access_token: "old_token",
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "ig_1",
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

describe("handleTokenRefresh", () => {
  for (const provider of [
    "x",
    "instagram",
    "facebook",
    "threads",
    "pinterest",
    "youtube",
    "bluesky",
    "linkedin",
    "tiktok",
    "tiktok_business",
  ]) {
    test(`reloads latest credentials and continues after ${provider} refresh throws`, async () => {
      const current = { ...account, provider } as SocialAccount;
      const latest = {
        ...current,
        access_token: "latest_access",
        refresh_token: "latest_refresh",
        access_token_expires_at: "2026-12-01T00:00:00.000Z",
        refresh_token_expires_at: "2027-01-01T00:00:00.000Z",
        social_provider_metadata: { connection_type: "oauth2" },
      };
      reloadSingle = mock(async () => ({ data: latest, error: null }));
      const refresh = mock(async () => {
        throw new Error("invalid_request");
      });

      expect(
        await mod.handleTokenRefresh({
          postClient: postClientWith(refresh),
          account: current,
        }),
      ).toEqual({ success: true });
      expect(current.access_token).toBe("latest_access");
      expect(current.refresh_token).toBe("latest_refresh");
      expect(current.access_token_expires_at).toEqual(
        new Date(latest.access_token_expires_at),
      );
      expect(current.refresh_token_expires_at).toEqual(
        new Date(latest.refresh_token_expires_at),
      );
      expect(current.social_provider_metadata).toEqual(
        latest.social_provider_metadata,
      );
      expect(reloadEq).toHaveBeenCalledWith("id", current.id);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(updateEq).not.toHaveBeenCalled();
    });
  }

  test("continues with stored credentials even when they have not changed", async () => {
    reloadSingle = mock(async () => ({ data: { ...account }, error: null }));
    const result = await mod.handleTokenRefresh({
      postClient: postClientWith(async () => {
        throw new Error("temporary failure");
      }),
      account,
    });
    expect(result).toEqual({ success: true });
    expect(account.access_token).toBe("old_token");
  });

  test("reloads after refresh returns no access token", async () => {
    reloadSingle = mock(async () => ({
      data: { ...account, access_token: "latest" },
      error: null,
    }));
    const result = await mod.handleTokenRefresh({
      postClient: postClientWith(async () => ({
        access_token: undefined,
        expires_at: "2026-12-01T00:00:00Z",
      })),
      account,
    });
    expect(result).toEqual({ success: true });
    expect(account.access_token).toBe("latest");
  });

  test("reloads after persisting refreshed tokens fails", async () => {
    updateEq = mock(async () => ({ error: { message: "write failed" } }));
    reloadSingle = mock(async () => ({
      data: { ...account, access_token: "stored" },
      error: null,
    }));
    const result = await mod.handleTokenRefresh({
      postClient: postClientWith(async () => ({
        access_token: "unpersisted",
        expires_at: "2026-12-01T00:00:00Z",
      })),
      account,
    });
    expect(result).toEqual({ success: true });
    expect(account.access_token).toBe("stored");
  });

  for (const scenario of ["missing", "no token", "throws"]) {
    test(`stops when account reload ${scenario}`, async () => {
      reloadSingle = mock(async () => {
        if (scenario === "throws") throw new Error("read failed");
        return {
          data:
            scenario === "missing" ? null : { ...account, access_token: null },
          error: null,
        };
      });
      const result = await mod.handleTokenRefresh({
        postClient: postClientWith(async () => {
          throw new Error("refresh failed");
        }),
        account,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("refresh failed");
    });
  }

  test("returns success and updates the connection when refresh succeeds", async () => {
    const postClient = postClientWith(async () => ({
      access_token: "new_token",
      expires_at: "2026-01-01T00:00:00.000Z",
    }));

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result).toEqual({ success: true });
    expect(updateEq).toHaveBeenCalledTimes(1);
    expect(reloadSingle).not.toHaveBeenCalled();
  });

  test("surfaces the platform's structured error body instead of the generic axios message", async () => {
    // The exact PFM-1218 scenario: Instagram's OAuthException 190 on an
    // expired session, currently flattened to "Request failed with status
    // code 400" with details entirely absent.
    const postClient = postClientWith(async () => {
      throw makeGraphError({
        status: 400,
        message:
          "Error validating access token: Session has expired and needs to be reconnected",
        code: 190,
      });
    });

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Error validating access token: Session has expired and needs to be reconnected",
    );
    expect(result.error).not.toBe("Request failed with status code 400");
    expect(result.details).toEqual({
      error: {
        message:
          "Error validating access token: Session has expired and needs to be reconnected",
        code: 190,
      },
    });
    expect(updateEq).not.toHaveBeenCalled();
  });

  test("falls back to the raw message with no details for a network-level failure", async () => {
    const postClient = postClientWith(async () => {
      throw new Error("socket hang up");
    });

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result).toEqual({
      success: false,
      error: "socket hang up",
      details: undefined,
    });
  });

  test("reports a generic error and no details when the platform returns no access token", async () => {
    const postClient = postClientWith(async () => ({
      access_token: undefined,
      expires_at: "2026-01-01T00:00:00.000Z",
    }));

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to refresh instagram token");
    expect(result.details).toBeUndefined();
  });

  test("passes through the Supabase update error unchanged when refresh succeeds but persisting fails", async () => {
    updateEq = mock(async () => ({ error: { message: "db unavailable" } }));
    const postClient = postClientWith(async () => ({
      access_token: "new_token",
      expires_at: "2026-01-01T00:00:00.000Z",
    }));

    const result = await mod.handleTokenRefresh({ postClient, account });

    expect(result).toEqual({ success: false, error: "db unavailable" });
  });
});
