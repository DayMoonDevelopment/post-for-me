import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type {
  FacebookConfiguration,
  PlatformAppCredentials,
  PostMedia,
  SocialAccount,
} from "../post.types";

// PFM-1057: `#publishVideo`, `#publishVideoStory`, and `#publishReel` each
// create a video object via Graph API, then immediately GET it back to poll
// processing status. That first read-back can transiently fail (Facebook
// eventual consistency, rate limiting) even though the object was just
// created successfully. These tests exercise the retry/backoff wrapper
// added around that read via the public `post()` API — the retry helpers
// are true private `#` class methods and can't be reached directly.
//
// All three flows poll the SAME video id on the SAME `?fields=status` URL
// (the story/reel "finish" status loop re-checks the id returned by their
// own "start" call), so one shared, call-count-driven mock handles every
// placement: the first calls are scripted per test to exercise the retry
// path, and every call after that falls back to an immediate "done" status
// so the rest of each flow (including the story/reel "finish" status loop,
// which also goes through the same retry wrapper) completes without extra
// setup.

const DEFAULT_VIDEO_ID = "video_123";

let videoStatusBehaviors: Array<() => unknown>;
let videoStatusCallCount: number;

const defaultVideoStatusResponse = () => ({
  data: {
    status: {
      video_status: "ready",
      processing_phase: { status: "complete" },
    },
  },
});

function makeGraphReadBackError({
  code,
  message,
  status = 400,
}: {
  code?: number;
  message: string;
  status?: number;
}) {
  const err: any = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { error: { code, message } } };
  return err;
}

function makeNetworkError(message = "socket hang up") {
  const err: any = new Error(message);
  err.isAxiosError = true;
  // Deliberately no `.response` — simulates a network-level failure
  // (timeout, ECONNRESET, DNS) rather than a Graph API error response.
  return err;
}

const axiosGet = mock(async (url: string) => {
  if (/\?fields=status$/.test(url)) {
    const behavior = videoStatusBehaviors[videoStatusCallCount];
    videoStatusCallCount++;
    if (behavior) {
      return behavior();
    }
    return defaultVideoStatusResponse();
  }

  if (url.includes("fields=url")) {
    return { data: { url: "https://facebook.com/story/permalink" } };
  }

  throw new Error(`Unhandled axios.get url in test: ${url}`);
});

const axiosPost = mock(async (url: string, body?: any) => {
  if (url.endsWith("/videos")) {
    return { data: { id: DEFAULT_VIDEO_ID } };
  }

  if (url.endsWith("/video_stories")) {
    if (body?.upload_phase === "start") {
      return {
        data: {
          upload_url: "https://upload.example/story",
          video_id: DEFAULT_VIDEO_ID,
        },
      };
    }
    if (body?.upload_phase === "finish") {
      return { data: { post_id: "story_post_1" } };
    }
  }

  if (url.endsWith("/video_reels")) {
    if (body?.upload_phase === "start") {
      return {
        data: {
          upload_url: "https://upload.example/reel",
          video_id: DEFAULT_VIDEO_ID,
        },
      };
    }
    if (body?.upload_phase === "finish") {
      return { data: {} };
    }
  }

  if (
    url === "https://upload.example/story" ||
    url === "https://upload.example/reel"
  ) {
    return { data: {} };
  }

  throw new Error(`Unhandled axios.post url in test: ${url}`);
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

let FacebookPostClient: typeof import("./facebook-post-client").FacebookPostClient;

beforeAll(async () => {
  ({ FacebookPostClient } = await import("./facebook-post-client"));
});

beforeEach(() => {
  videoStatusBehaviors = [];
  videoStatusCallCount = 0;
  axiosGet.mockClear();
  axiosPost.mockClear();
  waitFor.mockClear();
});

const appCredentials: PlatformAppCredentials = {
  app_id: "app_1",
  app_secret: "secret",
};

const makeAccount = (): SocialAccount => ({
  provider: "facebook",
  id: "spc_1",
  social_provider_user_name: "Test Page",
  access_token: "token_1",
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "page_1",
  social_provider_metadata: null,
});

const makeVideoMedium = (): PostMedia => ({
  id: "media_1",
  url: "https://cdn.example.com/video.mp4",
  type: "video",
});

const makeClient = () =>
  new FacebookPostClient({} as any, appCredentials);

const publishVideo = (placement?: FacebookConfiguration["placement"]) =>
  makeClient().post({
    postId: "post_1",
    account: makeAccount(),
    caption: "caption",
    media: [makeVideoMedium()],
    platformConfig: { placement },
  });

// The pre-existing outer processing-status loop (untouched by this change)
// also calls `wait.for({ seconds: 5 })` once per outer iteration — filter
// those out to isolate just the new inner read-back retry's own waits.
const innerRetryWaits = () =>
  waitFor.mock.calls.filter(([opts]) => opts.seconds < 5);

describe("FacebookPostClient video read-back retry (PFM-1057)", () => {
  test("publishes successfully when the status read-back succeeds on the first try", async () => {
    const result = await publishVideo();

    expect(result.success).toBe(true);
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(1);
  });

  test("retries the exact 'object does not exist' read-back error from the bug report and still succeeds", async () => {
    // This is the literal error Facebook returned in PFM-1045: the video
    // object isn't visible yet on the very first read-back after creation.
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({
          code: 100,
          message:
            "Unsupported get request. Object with ID '1232138859055506' does not exist, cannot be loaded due to missing permissions, or does not support this operation.",
        });
      },
    ];

    const result = await publishVideo();

    expect(result.success).toBe(true);
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(2);
    expect(innerRetryWaits()).toHaveLength(1);
  });

  test("retries a Meta rate-limit error on the read-back", async () => {
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({
          code: 4,
          message: "Application request limit reached",
        });
      },
    ];

    const result = await publishVideo();

    expect(result.success).toBe(true);
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(2);
  });

  test("retries a network-level error (no response) on the read-back", async () => {
    videoStatusBehaviors = [() => Promise.reject(makeNetworkError())];

    const result = await publishVideo();

    expect(result.success).toBe(true);
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(2);
  });

  test("backs off exponentially between read-back retries", async () => {
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
    ];

    const result = await publishVideo();

    expect(result.success).toBe(true);
    const waits = innerRetryWaits();
    expect(waits).toHaveLength(2);
    expect(waits[0][0]).toEqual({ seconds: 1 });
    expect(waits[1][0]).toEqual({ seconds: 2 });
  });

  test("does not retry a non-transient Graph error and fails immediately", async () => {
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({ code: 100, message: "Invalid parameter" });
      },
    ];

    const result = await publishVideo();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Failed to post to Facebook Invalid parameter",
    );
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(1);
  });

  test("does not retry a 'does not exist' message under a non-eventual-consistency error code", async () => {
    // Guards against the classifier being broadened to match on message text
    // alone — only code 100 + "does not exist" is treated as the known
    // eventual-consistency race; other codes carrying similar wording (e.g.
    // a genuine permissions error) must fail fast like today.
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({
          code: 200,
          message: "Object does not exist",
        });
      },
    ];

    const result = await publishVideo();

    expect(result.success).toBe(false);
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(1);
  });

  test("gives up after exhausting the retry budget on a persistently failing read-back", async () => {
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
    ];

    const result = await publishVideo();

    expect(result.success).toBe(false);
    // READ_BACK_MAX_ATTEMPTS: 1 initial try + 3 retries, no 5th attempt.
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(4);
  });

  test("also retries the read-back for the video story placement", async () => {
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
    ];

    const result = await publishVideo("stories");

    expect(result.success).toBe(true);
  });

  test("also retries the read-back for the reel placement", async () => {
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({ code: 100, message: "does not exist" });
      },
    ];

    const result = await publishVideo("reels");

    expect(result.success).toBe(true);
  });
});
