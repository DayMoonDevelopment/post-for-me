import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type {
  PlatformAppCredentials,
  PostMedia,
  SocialAccount,
} from "../post.types";

// PFM-1218 / PFM-1209: Instagram post failures (a single container-creation
// call, a carousel item, the carousel parent container, or the publish call)
// were flattened into a generic string (`error.response.data.error.message`)
// and then re-thrown as a plain `new Error(string)`, which discards the
// original axios error's `.response` on every re-throw. By the time the
// top-level `post()` catch built the PostResult, there was nothing left to
// put in `details` beyond a flattened string (or, for the raw-Error-object
// case, `{}` once inserted into jsonb — `Error.message` isn't enumerable).
// These tests exercise the fix via the public `post()` API: Instagram's full
// structured error body (`code`, `error_subcode`, etc.) must reach
// `PostResult.details`.

function makeGraphError({
  status = 400,
  message,
  code,
  error_subcode,
}: {
  status?: number;
  message: string;
  code?: number;
  error_subcode?: number;
}) {
  const err: any = new Error(message);
  err.isAxiosError = true;
  err.response = {
    status,
    data: { error: { message, code, error_subcode } },
  };
  return err;
}

let createMediaBehaviors: Array<() => unknown>;
let createMediaCallCount: number;
let carouselParentBehavior: (() => unknown) | null;
let publishBehavior: (() => unknown) | null;
let statusBehavior: (() => unknown) | null;
let getPostUrlBehavior: (() => unknown) | null;

const axiosPost = mock(async (url: string, payload?: any) => {
  if (url.endsWith("/media_publish")) {
    if (publishBehavior) return publishBehavior();
    return { data: { id: "platform_post_1" } };
  }

  if (url.endsWith("/media")) {
    if (payload?.media_type === "CAROUSEL") {
      if (carouselParentBehavior) return carouselParentBehavior();
      return { data: { id: "carousel_container_1" } };
    }

    const behavior = createMediaBehaviors[createMediaCallCount];
    createMediaCallCount++;
    if (behavior) return behavior();
    return { data: { id: `container_${createMediaCallCount}` } };
  }

  throw new Error(`Unhandled axios.post url in test: ${url}`);
});

const axiosGet = mock(async (url: string, config?: any) => {
  if (config?.params?.fields?.startsWith("status_code")) {
    if (statusBehavior) return statusBehavior();
    return { data: { status_code: "FINISHED" } };
  }

  if (config?.params?.fields === "permalink,media_type") {
    if (getPostUrlBehavior) return getPostUrlBehavior();
    return { data: { permalink: "https://instagram.com/p/xyz" } };
  }

  throw new Error(`Unhandled axios.get url in test: ${url}`);
});

mock.module("axios", () => ({
  default: { get: axiosGet, post: axiosPost },
}));

const waitFor = mock(async (_opts: { seconds: number }) => undefined);

mock.module("@trigger.dev/sdk", () => {
  // `require` (not `import`) is required here: an async `import()` inside
  // this factory re-enters bun's mock resolution for the same specifier and
  // deadlocks, whereas a synchronous `require()` resolves to the real module.
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

let InstagramPostClient: typeof import("./instagram-post-client").InstagramPostClient;

beforeAll(async () => {
  ({ InstagramPostClient } = await import("./instagram-post-client"));
});

beforeEach(() => {
  createMediaBehaviors = [];
  createMediaCallCount = 0;
  carouselParentBehavior = null;
  publishBehavior = null;
  statusBehavior = null;
  getPostUrlBehavior = null;
  axiosPost.mockClear();
  axiosGet.mockClear();
  waitFor.mockClear();
});

const appCredentials: PlatformAppCredentials = {
  app_id: "app_1",
  app_secret: "secret",
};

const makeAccount = (): SocialAccount => ({
  provider: "instagram",
  id: "spc_1",
  social_provider_user_name: "test_account",
  access_token: "token_1",
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "ig_1",
  social_provider_metadata: null,
});

// Video media skips `#transformImage`'s sharp/image-upload pipeline
// entirely (it only calls the trivial `getSignedUrlForFile` passthrough),
// which keeps these tests focused on the Graph API error-handling paths.
const makeVideoMedium = (id: string): PostMedia => ({
  id,
  url: `https://cdn.example.com/${id}.mp4`,
  type: "video",
});

const makeClient = () => new InstagramPostClient({} as any, appCredentials);

const publishSingle = () =>
  makeClient().post({
    postId: "post_1",
    account: makeAccount(),
    caption: "caption",
    media: [makeVideoMedium("media_1")],
    platformConfig: {},
  });

const publishCarousel = () =>
  makeClient().post({
    postId: "post_1",
    account: makeAccount(),
    caption: "caption",
    media: [makeVideoMedium("media_1"), makeVideoMedium("media_2")],
    platformConfig: {},
  });

describe("InstagramPostClient error detail propagation", () => {
  test("posts a single video successfully (happy path)", async () => {
    const result = await publishSingle();

    expect(result.success).toBe(true);
    expect(result.provider_post_id).toBe("platform_post_1");
  });

  test("posts a carousel successfully (happy path)", async () => {
    const result = await publishCarousel();

    expect(result.success).toBe(true);
    expect(result.provider_post_id).toBe("platform_post_1");
  });

  test("a non-retryable carousel-item failure surfaces Instagram's structured error in details, not a flattened string", async () => {
    createMediaBehaviors = [
      () => {
        throw makeGraphError({
          status: 400,
          message: "User access is restricted, please contact us",
          code: 200,
        });
      },
    ];

    const result = await publishCarousel();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Failed to post to Instagram : User access is restricted, please contact us",
    );
    expect(result.error_message).not.toContain(
      "Request failed with status code",
    );

    const errorDetails = result.details?.error;
    expect(errorDetails).toBeDefined();
    expect(errorDetails.error.code).toBe(200);
    expect(errorDetails.error.message).toBe(
      "User access is restricted, please contact us",
    );

    // Regression guard: a raw `Error`/`AxiosError` object serializes to `{}`
    // in jsonb because `message` is non-enumerable — this is what produced
    // `details: null`/`{}` before the fix even when something WAS captured.
    const roundTripped = JSON.parse(JSON.stringify(result.details));
    expect(roundTripped.error.error.code).toBe(200);

    // Non-retryable: only the first carousel item's container-create call
    // should have happened.
    expect(createMediaCallCount).toBe(1);
  });

  test("a carousel parent container failure (no retry loop) surfaces the platform error", async () => {
    carouselParentBehavior = () => {
      throw makeGraphError({ status: 400, message: "Invalid parameter", code: 100 });
    };

    const result = await publishCarousel();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Failed to post to Instagram : Invalid parameter",
    );
    expect(result.details?.error?.error?.code).toBe(100);
  });

  test("a 401 during media creation returns the reconnect message with the real platform body in details", async () => {
    createMediaBehaviors = [
      () => {
        // Crafted to also match `#isNonRetryableError` (via "user access is
        // restricted") so this resolves in a single attempt instead of
        // exhausting the 30-attempt retry budget.
        throw makeGraphError({
          status: 401,
          message: "Error validating access token: user access is restricted",
          code: 190,
          error_subcode: 463,
        });
      },
    ];

    const result = await publishSingle();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Account needs to be reconnected, Access token has expired",
    );

    const errorDetails = result.details?.error;
    expect(errorDetails.error.code).toBe(190);
    expect(errorDetails.error.error_subcode).toBe(463);

    const roundTripped = JSON.parse(JSON.stringify(result.details));
    expect(roundTripped.error.error.code).toBe(190);

    expect(createMediaCallCount).toBe(1);
  });

  test("a non-retryable publish failure surfaces the platform error instead of a generic message", async () => {
    publishBehavior = () => {
      throw makeGraphError({
        status: 400,
        message: "User access is restricted, please contact us",
        code: 200,
      });
    };

    const result = await publishSingle();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Failed to post to Instagram : User access is restricted, please contact us",
    );
    expect(result.details?.error?.error?.code).toBe(200);
  });

  test("a media processing ERROR status surfaces Instagram's actual status text, not a generic 'Upload failed'", async () => {
    statusBehavior = () => ({
      data: {
        status_code: "ERROR",
        status: "Media processing failed: unsupported codec",
      },
    });

    const result = await publishSingle();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Failed to post to Instagram : Upload failed: Media processing failed: unsupported codec",
    );
    expect(result.details?.error?.status).toBe(
      "Media processing failed: unsupported codec",
    );
  });

  test("falls back to a generic 'Upload failed' message when Instagram's ERROR status carries no status text", async () => {
    statusBehavior = () => ({ data: { status_code: "ERROR" } });

    const result = await publishSingle();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Failed to post to Instagram : Upload failed",
    );
  });

  test("a 200-OK-with-error-body permalink fetch surfaces Instagram's structured error, not a flattened string", async () => {
    getPostUrlBehavior = () => ({
      data: {
        error: {
          message: "User access is restricted, please contact us",
          code: 200,
        },
      },
    });

    const result = await publishSingle();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Failed to post to Instagram : User access is restricted, please contact us",
    );

    const errorDetails = result.details?.error;
    expect(errorDetails).toBeDefined();
    expect(errorDetails.error.code).toBe(200);
    expect(errorDetails.error.message).toBe(
      "User access is restricted, please contact us",
    );

    // Regression guard: the old code threw a plain `new Error(string)` here,
    // which discarded the structured Graph API error body entirely.
    const roundTripped = JSON.parse(JSON.stringify(result.details));
    expect(roundTripped.error.error.code).toBe(200);
  });

  test("a 200-OK-with-error-body OAuthException (code 190) during carousel creation returns the reconnect message even with no HTTP 401", async () => {
    carouselParentBehavior = () => ({
      data: {
        error: {
          message: "Error validating access token: Session has expired",
          code: 190,
          type: "OAuthException",
        },
      },
    });

    const result = await publishCarousel();

    expect(result.success).toBe(false);
    // Regression guard: `wrapResponseDataError` call sites never attach an
    // HTTP status (the response is a 200 OK), so a check on `status === 401`
    // alone would miss this and fall through to the generic error message.
    expect(result.error_message).toBe(
      "Account needs to be reconnected, Access token has expired",
    );
    expect(result.details?.error?.error?.code).toBe(190);
  });
});
