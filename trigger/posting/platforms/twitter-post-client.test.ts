import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import type {
  PlatformAppCredentials,
  SocialAccount,
  TwitterConfiguration,
} from "../post.types";

let verifiedType: string | undefined = "none";
let userLookupError: Error | undefined;

const me = mock(async () => {
  if (userLookupError) throw userLookupError;
  return { data: { verified_type: verifiedType } };
});
const tweet = mock(async (_payload: { text: string }) => ({
  data: { id: "tweet_1" },
}));
const twitterClientInputs: unknown[] = [];

mock.module("twitter-api-v2", () => {
  class TwitterApi {
    v2 = { me, tweet };

    constructor(input: unknown) {
      twitterClientInputs.push(input);
    }
  }

  return { EUploadMimeType: {}, TwitterApi };
});

const waitFor = mock(async (_opts: { seconds: number }) => undefined);

mock.module("@trigger.dev/sdk", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual: typeof import("@trigger.dev/sdk") = require("@trigger.dev/sdk");
  return {
    ...actual,
    wait: {
      ...actual.wait,
      for: waitFor,
    },
  };
});

let TwitterPostClient: typeof import("./twitter-post-client").TwitterPostClient;

beforeAll(async () => {
  ({ TwitterPostClient } = await import("./twitter-post-client"));
});

beforeEach(() => {
  verifiedType = "none";
  userLookupError = undefined;
  me.mockClear();
  tweet.mockClear();
  waitFor.mockClear();
  twitterClientInputs.length = 0;
});

const appCredentials: PlatformAppCredentials = {
  app_id: "app_1",
  app_secret: "secret_1",
};

const makeAccount = (
  metadata: Record<string, unknown>,
): SocialAccount => ({
  provider: "x",
  id: "connection_1",
  social_provider_user_name: "test-user",
  access_token: "access_token_1",
  refresh_token: "refresh_token_1",
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "user_1",
  social_provider_metadata: metadata,
});

function makeSupabaseClient() {
  const eq = mock(async (_column: string, _value: string) => ({
    data: null,
    error: null,
  }));
  const update = mock((_value: unknown) => ({ eq }));
  const from = mock((_table: string) => ({ update }));

  return { client: { from } as any, from, update, eq };
}

async function publish({
  metadata,
  caption = "x".repeat(500),
}: {
  metadata: Record<string, unknown>;
  caption?: string;
}) {
  const supabase = makeSupabaseClient();
  const client = new TwitterPostClient(supabase.client, appCredentials);
  const result = await client.post({
    postId: "post_1",
    account: makeAccount(metadata),
    caption,
    media: [],
    platformConfig: {} as TwitterConfiguration,
  });

  return { result, supabase };
}

function publishedText(): string {
  return tweet.mock.calls[0][0].text;
}

describe("TwitterPostClient live premium status", () => {
  test("uses a live premium upgrade and preserves unrelated OAuth 1.0a metadata", async () => {
    verifiedType = "blue";

    const { result, supabase } = await publish({
      metadata: {
        connection_type: "oauth1",
        has_platform_premium: false,
        verified_type: "none",
        unrelated: "keep-me",
      },
    });

    expect(result.success).toBe(true);
    expect(publishedText()).toHaveLength(500);
    expect(me).toHaveBeenCalledWith({ "user.fields": "verified_type" });
    expect(twitterClientInputs[0]).toEqual({
      appKey: "app_1",
      appSecret: "secret_1",
      accessToken: "access_token_1",
      accessSecret: "refresh_token_1",
    });
    expect(supabase.from).toHaveBeenCalledWith(
      "social_provider_connections",
    );
    expect(supabase.update).toHaveBeenCalledWith({
      social_provider_metadata: {
        connection_type: "oauth1",
        has_platform_premium: true,
        verified_type: "blue",
        unrelated: "keep-me",
      },
    });
    expect(supabase.eq).toHaveBeenCalledWith("id", "connection_1");
  });

  test("uses a live downgrade with an OAuth 2.0 client", async () => {
    verifiedType = "none";

    const { result, supabase } = await publish({
      metadata: {
        connection_type: "oauth2",
        has_platform_premium: true,
        verified_type: "blue",
      },
    });

    expect(result.success).toBe(true);
    expect(publishedText()).toHaveLength(280);
    expect(twitterClientInputs[0]).toBe("access_token_1");
    expect(supabase.update).toHaveBeenCalledWith({
      social_provider_metadata: {
        connection_type: "oauth2",
        has_platform_premium: false,
        verified_type: "none",
      },
    });
  });

  test("synchronizes a changed verified type when premium status is unchanged", async () => {
    verifiedType = "business";

    const { supabase } = await publish({
      metadata: {
        connection_type: "oauth2",
        has_platform_premium: true,
        verified_type: "blue",
      },
    });

    expect(publishedText()).toHaveLength(500);
    expect(supabase.update).toHaveBeenCalledWith({
      social_provider_metadata: {
        connection_type: "oauth2",
        has_platform_premium: true,
        verified_type: "business",
      },
    });
  });

  test("falls back to the stored premium flag when the X lookup fails", async () => {
    userLookupError = new Error("X is unavailable");
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const { result, supabase } = await publish({
        metadata: {
          connection_type: "oauth1",
          has_platform_premium: true,
          verified_type: "blue",
        },
      });

      expect(result.success).toBe(true);
      expect(publishedText()).toHaveLength(500);
      expect(tweet).toHaveBeenCalledTimes(1);
      expect(supabase.update).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(
          "Twitter account connection_1, falling back to stored value",
        ),
        userLookupError,
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  test("does not update metadata when stored and live values match", async () => {
    verifiedType = "blue";

    const { supabase } = await publish({
      metadata: {
        connection_type: "oauth2",
        has_platform_premium: true,
        verified_type: "blue",
      },
    });

    expect(publishedText()).toHaveLength(500);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.update).not.toHaveBeenCalled();
  });
});
