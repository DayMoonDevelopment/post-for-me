import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { PlatformAppCredentials, SocialAccount } from "../post.types";

// `YouTubePostClient.refreshAccessToken` drives Google's OAuth2 client
// directly. Intercept `googleapis`' `google.auth.OAuth2` so refresh behavior
// (success, transient failure, auth failure) can be exercised without a live
// Google connection.
type RefreshBehavior =
  | { type: "success"; credentials: Record<string, unknown> }
  | { type: "error"; error: unknown };

let refreshBehavior: RefreshBehavior = {
  type: "success",
  credentials: {
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
    expiry_date: Date.now() + 3600 * 1000,
    scope: "scope",
    token_type: "Bearer",
  },
};

const setCredentialsCalls: Record<string, unknown>[] = [];

class MockOAuth2Client {
  setCredentials(creds: Record<string, unknown>) {
    setCredentialsCalls.push(creds);
  }

  async refreshAccessToken() {
    if (refreshBehavior.type === "error") {
      throw refreshBehavior.error;
    }
    return { credentials: refreshBehavior.credentials };
  }
}

mock.module("googleapis", () => ({
  google: {
    auth: { OAuth2: MockOAuth2Client },
    youtube: () => ({}),
  },
}));

let YouTubePostClient: typeof import("./youtube-post-client").YouTubePostClient;
let YouTubeRefreshError: typeof import("./youtube-post-client").YouTubeRefreshError;

beforeAll(async () => {
  const mod = await import("./youtube-post-client");
  YouTubePostClient = mod.YouTubePostClient;
  YouTubeRefreshError = mod.YouTubeRefreshError;
});

const appCredentials: PlatformAppCredentials = {
  app_id: "client-id",
  app_secret: "client-secret",
};

const makeAccount = (
  overrides: Partial<SocialAccount> = {},
): SocialAccount => ({
  provider: "youtube",
  id: "account_1",
  social_provider_user_name: "Test Channel",
  access_token: "existing-access-token",
  refresh_token: "existing-refresh-token",
  access_token_expires_at: new Date(Date.now() + 30 * 60 * 1000),
  refresh_token_expires_at: null,
  social_provider_user_id: "channel_1",
  social_provider_metadata: null,
  ...overrides,
});

describe("YouTubePostClient.refreshAccessToken", () => {
  beforeEach(() => {
    setCredentialsCalls.length = 0;
    refreshBehavior = {
      type: "success",
      credentials: {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expiry_date: Date.now() + 3600 * 1000,
        scope: "scope",
        token_type: "Bearer",
      },
    };
  });

  test("uses access_token_expires_at (not refresh_token_expires_at) when seeding the OAuth2 client", async () => {
    const client = new YouTubePostClient(
      {} as never,
      appCredentials,
    );
    const account = makeAccount({
      access_token_expires_at: new Date("2026-01-01T00:00:00.000Z"),
      refresh_token_expires_at: null,
    });

    await client.refreshAccessToken(account);

    expect(setCredentialsCalls[0]?.expiry_date).toBe(
      new Date("2026-01-01T00:00:00.000Z").getTime(),
    );
  });

  test("returns the refreshed token on success", async () => {
    const client = new YouTubePostClient({} as never, appCredentials);
    const account = makeAccount();

    const result = await client.refreshAccessToken(account);

    expect(result.access_token).toBe("new-access-token");
    expect(result.refresh_token).toBe("new-refresh-token");
  });

  test("falls back to the existing access token on a retryable failure", async () => {
    refreshBehavior = {
      type: "error",
      error: Object.assign(new Error("Internal error"), {
        response: { status: 500 },
      }),
    };

    const client = new YouTubePostClient({} as never, appCredentials);
    const account = makeAccount({
      access_token: "still-valid-access-token",
      access_token_expires_at: new Date(Date.now() + 30 * 60 * 1000),
    });

    const result = await client.refreshAccessToken(account);

    expect(result.access_token).toBe("still-valid-access-token");
  });

  test("throws a non-retryable auth failure for invalid_grant", async () => {
    refreshBehavior = {
      type: "error",
      error: new Error("invalid_grant: Token has been expired or revoked."),
    };

    const client = new YouTubePostClient({} as never, appCredentials);
    const account = makeAccount({
      access_token_expires_at: new Date(Date.now() + 30 * 60 * 1000),
    });

    let thrown: unknown;
    try {
      await client.refreshAccessToken(account);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(YouTubeRefreshError);
    expect((thrown as InstanceType<typeof YouTubeRefreshError>).metadata.authFailure).toBe(
      true,
    );
  });

  test("throws a retryable failure when there is no usable existing token to fall back to", async () => {
    refreshBehavior = {
      type: "error",
      error: Object.assign(new Error("Internal error"), {
        response: { status: 503 },
      }),
    };

    const client = new YouTubePostClient({} as never, appCredentials);
    const account = makeAccount({
      access_token_expires_at: new Date(Date.now() - 30 * 60 * 1000),
    });

    let thrown: unknown;
    try {
      await client.refreshAccessToken(account);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(YouTubeRefreshError);
    expect((thrown as InstanceType<typeof YouTubeRefreshError>).metadata.retryable).toBe(
      true,
    );
  });
});
