import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
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
const COPIED_VIDEO_URL = "https://project.supabase.co/storage/v1/object/public/media/video.mp4";

let videoStatusBehaviors: Array<() => unknown>;
let videoStatusCallCount: number;
let photoBehaviors: Array<(body: any) => any>;

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

const axiosGet = mock(async (url: string, config?: any) => {
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

  if (config?.params?.fields === "post_id") {
    return { data: { post_id: "page_1_456" } };
  }

  if (url.endsWith("/photo_post_1") || url.endsWith("/carousel_post_1")) {
    return { data: { permalink_url: "https://facebook.com/photo/permalink" } };
  }

  if (url.endsWith(`/${DEFAULT_VIDEO_ID}`)) {
    return { data: { post_id: "video_post_1" } };
  }

  throw new Error(`Unhandled axios.get url in test: ${url}`);
});

const axiosPost = mock(async (url: string, body?: any, _config?: any) => {
  if (url.endsWith("/photos")) {
    const behavior = photoBehaviors.shift();
    if (behavior) return behavior(body);
    return { data: { id: "photo_1", post_id: "photo_post_1" } };
  }
  if (url.endsWith("/photo_stories")) {
    return { data: { post_id: "story_post_1" } };
  }
  if (url.endsWith("/feed")) {
    return { data: { id: "carousel_post_1" } };
  }

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
let tasks: typeof import("@trigger.dev/sdk").tasks;
let copyMedia: ReturnType<typeof mock<typeof tasks.triggerAndWait>>;

beforeAll(async () => {
  ({ tasks } = await import("@trigger.dev/sdk"));
  ({ FacebookPostClient } = await import("./facebook-post-client"));
});

beforeEach(() => {
  photoBehaviors = [];
  videoStatusBehaviors = [];
  videoStatusCallCount = 0;
  axiosGet.mockClear();
  axiosPost.mockClear();
  waitFor.mockClear();
  copyMedia = spyOn(tasks, "triggerAndWait").mockResolvedValue({
    ok: true,
    id: "copy_run_1",
    taskIdentifier: "copy-media-to-supabase",
    output: COPIED_VIDEO_URL,
  });
});

afterEach(() => {
  copyMedia.mockRestore();
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
  new FacebookPostClient(appCredentials);

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

describe("Facebook thumbnail child boundary", () => {
  for (const placement of [undefined, "reels", "stories"] as const) {
    for (const failure of [false, true, "throw"] as const) {
      test(`${placement ?? "feed"}: child failure=${failure}`, async () => {
        const events: string[] = [];
        copyMedia.mockImplementation((async (id: string, payload: unknown) => {
          if (id === "copy-media-to-supabase") return { ok: true, output: COPIED_VIDEO_URL };
          expect(id).toBe("upload-facebook-thumbnail");
          expect(payload).toEqual({
            thumbnailUrl: "https://cdn.example.com/cover.png",
            videoId: DEFAULT_VIDEO_ID,
            accessToken: "token_1",
            baseUrl: "https://graph.facebook.com/v25.0",
          });
          events.push("thumbnail");
          expect(videoStatusCallCount).toBeGreaterThan(0);
          expect(axiosPost.mock.calls.some(([, body]) => body?.upload_phase === "finish")).toBe(false);
          if (failure === "throw") throw new Error("thumbnail network failure");
          return failure ? { ok: false, error: { message: "thumbnail network failure" } } : { ok: true };
        }) as typeof tasks.triggerAndWait);
        const client = makeClient();
        const download = spyOn(client, "getFile").mockRejectedValue(new Error("Parent must not download"));
        const result = await client.post({
          postId: "post_1", account: makeAccount(), caption: "caption",
          media: [{ ...makeVideoMedium(), thumbnail_url: "https://cdn.example.com/cover.png" }],
          platformConfig: { placement },
        });
        expect(result.success).toBe(placement === "stories" || !failure);
        if (placement !== "stories" && failure) {
          expect(result.error_message).toContain("thumbnail network failure");
        }
        expect(events).toEqual(placement === "stories" ? [] : ["thumbnail"]);
        expect(download).not.toHaveBeenCalled();
        download.mockRestore();
      });
    }
  }
});

describe("FacebookPostClient media tag platform filters", () => {
  for (const placement of ["feed", "stories", "carousel"] as const) {
    test(`matches case and whitespace variants for ${placement} without changing input`, async () => {
      const tags = ["facebook", "Facebook", "FACEBOOK", " \tFaCeBoOk\n", "instagram"].map(
        (platform, index) => ({ platform, type: "user", id: `user_${index}`, x: 0.2, y: 0.3 }),
      );
      tags.push({ platform: "Facebook", type: "product", id: "product_1", x: 0.2, y: 0.3 });
      const medium: PostMedia = {
        id: "media_1",
        url: "https://cdn.example.com/photo.jpg",
        type: "image",
        tags,
      };
      const media = placement === "carousel" ? [medium, { ...medium, id: "media_2" }] : [medium];
      const originalInput = JSON.stringify(media);

      const result = await makeClient().post({
        postId: "post_1",
        account: makeAccount(),
        caption: "caption",
        media,
        platformConfig: { placement: placement === "stories" ? "stories" : undefined },
      });

      expect(result.success).toBe(true);
      const photoCalls = axiosPost.mock.calls.filter(([url]) => url.endsWith("/photos"));
      expect(photoCalls).toHaveLength(media.length);
      for (const [, payload] of photoCalls) {
        expect(payload.tags).toEqual(tags.slice(0, 4).map((tag) => ({
          tag_uid: tag.id, x: tag.x, y: tag.y,
        })));
      }
      expect(JSON.stringify(media)).toBe(originalInput);
    });
  }
});

describe("Facebook photo upload retries", () => {
  const publish = (placement: "feed" | "stories" | "carousel" = "feed", setCaption = true) =>
    makeClient().post({
      postId: "post_1",
      account: makeAccount(),
      caption: "private caption",
      media: (placement === "carousel" ? ["image_1", "image_2"] : ["image_1"]).map((id) => ({
        id, type: "image" as const,
        url: `https://cdn.example.com/${id}.png?signature=private_signature`,
        alt_text: "accessible photo",
      })),
      platformConfig: {
        placement: placement === "stories" ? "stories" : undefined,
        set_caption_for_each_image: setCaption,
      },
    });

  for (const placement of ["feed", "stories", "carousel"] as const) {
    test(`${placement}: retries explicit rate limits and uses caption`, async () => {
      photoBehaviors = [() => {
        throw makeGraphReadBackError({ code: 4, message: "Too many calls" });
      }];
      const result = await publish(placement);
      expect(result.success).toBe(true);
      expect(waitFor.mock.calls).toEqual([[{ seconds: 5 }]]);
      const uploads = axiosPost.mock.calls.filter(([url]) => url.endsWith("/photos"));
      expect(uploads).toHaveLength(placement === "carousel" ? 3 : 2);
      for (const [url, body] of uploads) {
        expect(url).toContain("https://graph.facebook.com/");
        expect(body.caption).toBe("private caption");
        expect(body).not.toHaveProperty("message");
      }
      const finalEdge = placement === "stories" ? "/photo_stories" : "/feed";
      expect(axiosPost.mock.calls.filter(([url]) => url.endsWith(finalEdge)))
        .toHaveLength(1);
      if (placement === "carousel") {
        expect(axiosPost.mock.calls.find(([url]) => url.endsWith("/feed"))?.[1].message)
          .toBe("private caption");
      }
    });
  }

  test("exhausts three attempts, records sanitized diagnostics and both delays", async () => {
    photoBehaviors = Array.from({ length: 3 }, () => () => {
      const error = makeGraphReadBackError({ code: 4, message: "Too many calls", status: 400 });
      error.response.headers = {
        "x-fb-trace-id": "trace_1", "x-app-usage": "usage",
        "set-cookie": "private_cookie",
      };
      error.response.data.error.fbtrace_id = "body_trace";
      throw error;
    });
    const result = await publish();
    expect(result.success).toBe(false);
    expect(waitFor.mock.calls).toEqual([[{ seconds: 5 }], [{ seconds: 15 }]]);
    const details = result.details as any;
    expect(details.requests).toHaveLength(3);
    expect(details.responses).toHaveLength(3);
    expect(details.requests[0].photoRequest).toMatchObject({
      attempt: 1, placement: "feed", mediaId: "image_1",
      mediaHostname: "cdn.example.com", captionLength: 15, tagCount: 0, hasLocation: false,
    });
    expect(details.responses[0].photoUpload).toMatchObject({
      status: 400, code: 4, traceId: "trace_1", fbtraceId: "body_trace",
      appUsage: "usage", willRetry: true, retryDelaySeconds: 5,
    });
    expect(details.responses[2].photoUpload.willRetry).toBe(false);
    const diagnostics = JSON.stringify({ requests: details.requests, responses: details.responses });
    for (const secret of ["token_1", "private caption", "private_signature", "private_cookie"]) {
      expect(diagnostics).not.toContain(secret);
    }
  });

  for (const shape of ["throw", "body"] as const) {
    for (const graphError of [{ code: 4 }, { code: 17 }, { code: 32 }, { code: 613 }]) {
      test(`retries ${shape} error ${JSON.stringify(graphError)}`, async () => {
        photoBehaviors = [() => {
          const data = { error: { ...graphError, message: "temporary failure" } };
          if (shape === "body") return { status: 200, data };
          throw { response: { status: 400, data } };
        }];
        expect((await publish()).success).toBe(true);
        expect(waitFor).toHaveBeenCalledTimes(1);
      });
    }
  }

  test("retries HTTP 429 without a Graph body", async () => {
    photoBehaviors = [() => { throw { response: { status: 429, data: {} } }; }];
    expect((await publish()).success).toBe(true);
    expect(waitFor).toHaveBeenCalledTimes(1);
  });

  for (const placement of ["feed", "stories", "carousel"] as const) {
    for (const shape of ["throw", "body"] as const) {
      for (const graphError of [
        { code: 1, error_subcode: 99 },
        { code: 2 },
        { code: 999, is_transient: true },
      ]) {
        test(`${placement}: does not retry ambiguous ${shape} error ${JSON.stringify(graphError)}`, async () => {
          photoBehaviors = [() => {
            const data = { error: { ...graphError, message: "Unknown error" } };
            if (shape === "body") return { status: 200, data };
            throw { response: { status: 500, data } };
          }];
          const result = await publish(placement);
          expect(result.success).toBe(false);
          expect(waitFor).not.toHaveBeenCalled();
          expect(axiosPost).toHaveBeenCalledTimes(1);
          expect((result.details as any).responses[0].photoUpload.willRetry).toBe(false);
        });
      }
    }
  }

  for (const [status, code] of [[500, 4], [429, 1], [429, 2]]) {
    test(`does not retry conflicting HTTP ${status} / code ${code}`, async () => {
      photoBehaviors = [() => {
        throw makeGraphReadBackError({ status, code, message: "ambiguous" });
      }];
      expect((await publish()).success).toBe(false);
      expect(waitFor).not.toHaveBeenCalled();
      expect(axiosPost).toHaveBeenCalledTimes(1);
    });
  }

  test("single photos upload unpublished before publishing the exact photo through feed", async () => {
    const medium: PostMedia = {
      id: "image_1", type: "image", url: "https://cdn.example.com/photo.png",
      alt_text: "Accessible description",
      tags: [{ platform: "facebook", type: "user", id: "user_1", x: 0.2, y: 0.3 }],
    };
    const original = structuredClone(medium);
    photoBehaviors = [() => ({ data: { id: "uploaded_photo", post_id: "not_a_feed_success" } })];
    const result = await makeClient().post({
      postId: "post_1", account: makeAccount(), caption: "Photo caption",
      media: [medium], platformConfig: { location: "place_1" },
    });
    expect(result.success).toBe(true);
    expect(result.provider_post_id).toBe("carousel_post_1");
    expect(axiosPost).toHaveBeenCalledTimes(2);
    expect(axiosPost.mock.calls[0][0]).toEndWith("/page_1/photos");
    expect(axiosPost.mock.calls[0][1]).toEqual({
      url: medium.url, access_token: "token_1", published: false,
      caption: "Photo caption", alt_text_custom: "Accessible description",
      tags: [{ tag_uid: "user_1", x: 0.2, y: 0.3 }],
    });
    expect(axiosPost.mock.calls[1][0]).toEndWith("/page_1/feed");
    expect(axiosPost.mock.calls[1][1]).toEqual({
      message: "Photo caption", access_token: "token_1", published: true,
      attached_media: [{ media_fbid: "uploaded_photo" }], place: "place_1",
    });
    expect(medium).toEqual(original);
  });

  test("does not publish a single photo when its upload response lacks an id", async () => {
    photoBehaviors = [() => ({ data: { post_id: "not_a_photo_id" } })];
    expect((await publish()).success).toBe(false);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(waitFor).not.toHaveBeenCalled();
  });

  for (const data of [{ error: { code: 1, error_subcode: 99, message: "Unknown error" } }, {}]) {
    test(`feed response ${JSON.stringify(data)} does not treat an uploaded photo as published`, async () => {
      axiosPost.mockImplementationOnce(async () => ({ data: { id: "uploaded_photo", post_id: "album_story" } }));
      axiosPost.mockImplementationOnce(async () => ({ data } as any));
      const result = await publish();
      expect(result.success).toBe(false);
      expect(result.provider_post_id).toBeUndefined();
      expect(axiosPost).toHaveBeenCalledTimes(2);
      expect(waitFor).not.toHaveBeenCalled();
      expect((result.details as any).requests[1].publishPhotoPostRequest.photoId).toBe("uploaded_photo");
      expect((result.details as any).responses[0].photoResponse.id).toBe("uploaded_photo");
    });
  }

  test("retains headers for HTTP-200 error bodies and records eventual success", async () => {
    photoBehaviors = [() => ({
      status: 200,
      headers: { "x-fb-request-id": "request_1", "x-page-usage": "page_usage" },
      data: { error: { code: 4, message: "Too many calls" } },
    })];
    const result = await publish();
    const details = result.details as any;
    expect(result.success).toBe(true);
    expect(details.responses[0].photoUpload).toMatchObject({
      status: 200, code: 4, requestId: "request_1", pageUsage: "page_usage", outcome: "error",
    });
    expect(details.responses[1]).toMatchObject({
      photoResponse: { id: "photo_1", post_id: "photo_post_1" },
      photoUpload: { attempt: 2, outcome: "success" },
    });
  });

  for (const placement of ["feed", "stories", "carousel"] as const) {
    test(`${placement}: does not retry a failed final publish`, async () => {
      const finalEdge = placement === "stories" ? "/photo_stories" : "/feed";
      axiosPost.mockImplementationOnce(async () => ({ data: { id: "photo_1", post_id: "photo_post_1" } }));
      if (placement === "carousel") {
        axiosPost.mockImplementationOnce(async () => ({ data: { id: "photo_2", post_id: "photo_post_2" } }));
      }
      axiosPost.mockImplementationOnce(async () => {
        throw makeGraphReadBackError({ code: 1, message: "final publish failure" });
      });
      const result = await publish(placement);
      expect(result.success).toBe(false);
      expect(waitFor).not.toHaveBeenCalled();
      expect(axiosPost.mock.calls.filter(([url]) => url.endsWith(finalEdge))).toHaveLength(1);
      expect(axiosPost.mock.calls.filter(([url]) => url.endsWith("/photos")))
        .toHaveLength(placement === "carousel" ? 2 : 1);
      if (placement === "feed") {
        expect((result.details as any).responses).toContainEqual(expect.objectContaining({
          publishPhotoPost: expect.objectContaining({ photoId: "photo_1", willRetry: false, code: 1 }),
        }));
      }
    });
  }

  for (const code of [10, 100, 190, 200, 283, 324]) {
    test(`does not retry permanent error ${code}, even with a transient flag`, async () => {
      photoBehaviors = [() => {
        throw { response: { status: 400, data: { error: { code, is_transient: true, message: "permanent" } } } };
      }];
      expect((await publish()).success).toBe(false);
      expect(waitFor).not.toHaveBeenCalled();
    });
  }

  for (const status of [undefined, 500, 503]) {
    test(`does not retry ambiguous failure with status ${status}`, async () => {
      photoBehaviors = [() => {
        if (!status) throw makeNetworkError();
        throw { response: { status, data: {} } };
      }];
      expect((await publish()).success).toBe(false);
      expect(waitFor).not.toHaveBeenCalled();
      expect(axiosPost).toHaveBeenCalledTimes(1);
    });
  }

  test("carousel retries only its failed image and preserves caption opt-out", async () => {
    photoBehaviors = [
      () => ({ data: { id: "first_photo" } }),
      () => { throw makeGraphReadBackError({ code: 4, message: "Too many calls" }); },
      () => ({ data: { id: "second_photo" } }),
    ];
    expect((await publish("carousel", false)).success).toBe(true);
    const uploads = axiosPost.mock.calls.filter(([url]) => url.endsWith("/photos"));
    expect(uploads.map(([, body]) => body.url.split("?")[0])).toEqual([
      "https://cdn.example.com/image_1.png",
      "https://cdn.example.com/image_2.png",
      "https://cdn.example.com/image_2.png",
    ]);
    for (const [, body] of uploads) {
      expect(body).not.toHaveProperty("caption");
      expect(body).not.toHaveProperty("message");
      expect(body.alt_text_custom).toBe("accessible photo");
    }
    expect(axiosPost.mock.calls.find(([url]) => url.endsWith("/feed"))?.[1].attached_media)
      .toEqual([{ media_fbid: "first_photo" }, { media_fbid: "second_photo" }]);
  });
});

describe("FacebookPostClient Supabase video copy", () => {
  for (const placement of ["stories", "reels"] as const) {
    test(`awaits the copy before starting the ${placement} upload and preserves input`, async () => {
      const medium = makeVideoMedium();
      const media = [medium];
      const originalMedia = structuredClone(media);
      const copied = Promise.withResolvers<{
        ok: true;
        id: string;
        taskIdentifier: string;
        output: string;
      }>();
      // The client only awaits the result, not the SDK promise's unwrap helper.
      copyMedia.mockReturnValueOnce(copied.promise as ReturnType<typeof tasks.triggerAndWait>);

      const posting = makeClient().post({
        postId: "post_1",
        account: makeAccount(),
        caption: "caption",
        media,
        platformConfig: { placement },
      });

      expect(copyMedia).toHaveBeenCalledTimes(1);
      expect(copyMedia).toHaveBeenCalledWith("copy-media-to-supabase", {
        url: originalMedia[0].url,
      });
      await Promise.resolve();
      expect(axiosPost).not.toHaveBeenCalled();
      expect(axiosGet).not.toHaveBeenCalled();
      expect(media).toEqual(originalMedia);

      copied.resolve({
        ok: true,
        id: "copy_run_1",
        taskIdentifier: "copy-media-to-supabase",
        output: COPIED_VIDEO_URL,
      });
      const result = await posting;

      expect(result.success).toBe(true);
      const endpoint = placement === "stories" ? "video_stories" : "video_reels";
      const uploadUrl = `https://upload.example/${placement === "stories" ? "story" : "reel"}`;
      expect(axiosPost.mock.calls[0][0]).toEndWith(`/page_1/${endpoint}`);
      expect(axiosPost.mock.calls[0][1]).toEqual({
        upload_phase: "start",
        access_token: "token_1",
      });
      expect(axiosPost.mock.calls.filter(([url]) => url === uploadUrl)).toEqual([
        [uploadUrl, placement === "stories" ? {} : null, {
          headers: { Authorization: "OAuth token_1", file_url: COPIED_VIDEO_URL },
        }],
      ]);
      expect(axiosPost.mock.calls.some(([url, body]) =>
        url.endsWith(`/${endpoint}`) && body?.upload_phase === "finish",
      )).toBe(true);
      expect(copyMedia).toHaveBeenCalledTimes(1);
      expect(media).toEqual(originalMedia);
      expect(media[0]).toBe(medium);
      expect(medium.url).toBe(originalMedia[0].url);
    });

    for (const failure of ["failed task", "rejection"] as const) {
      test(`falls back to the original URL when the ${placement} copy returns ${failure}`, async () => {
        if (failure === "failed task") {
          copyMedia.mockResolvedValueOnce({
            ok: false,
            id: "copy_run_1",
            taskIdentifier: "copy-media-to-supabase",
            error: { name: "Error", message: "Copy failed" },
          });
        } else {
          copyMedia.mockRejectedValueOnce(new Error("Copy task rejected"));
        }
        const medium = makeVideoMedium();
        const media = [medium];
        const originalMedia = structuredClone(media);

        const result = await makeClient().post({
          postId: "post_1",
          account: makeAccount(),
          caption: "caption",
          media,
          platformConfig: { placement },
        });

        expect(result.success).toBe(true);
        expect(copyMedia).toHaveBeenCalledTimes(1);
        expect(copyMedia).toHaveBeenCalledWith("copy-media-to-supabase", {
          url: originalMedia[0].url,
        });
        const endpoint = placement === "stories" ? "video_stories" : "video_reels";
        const uploadUrl = `https://upload.example/${placement === "stories" ? "story" : "reel"}`;
        expect(axiosPost.mock.calls[0][0]).toEndWith(`/page_1/${endpoint}`);
        expect(axiosPost.mock.calls.filter(([url]) => url === uploadUrl)).toEqual([
          [uploadUrl, placement === "stories" ? {} : null, {
            headers: { Authorization: "OAuth token_1", file_url: originalMedia[0].url },
          }],
        ]);
        expect(axiosPost.mock.calls.some(([url, body]) =>
          url.endsWith(`/${endpoint}`) && body?.upload_phase === "finish",
        )).toBe(true);
        expect(media).toEqual(originalMedia);
        expect(media[0]).toBe(medium);
      });
    }
  }

  for (const kind of ["feed video", "photo", "photo story", "carousel"] as const) {
    test(`does not copy a ${kind} and keeps the original media URL`, async () => {
      const medium: PostMedia = kind === "feed video"
        ? makeVideoMedium()
        : { id: "photo_1", url: "https://cdn.example.com/photo.jpg", type: "image" };
      const media = kind === "carousel" ? [medium, { ...medium, id: "photo_2" }] : [medium];
      const originalMedia = structuredClone(media);

      const result = await makeClient().post({
        postId: "post_1",
        account: makeAccount(),
        caption: "caption",
        media,
        platformConfig: { placement: kind === "photo story" ? "stories" : undefined },
      });

      expect(result.success).toBe(true);
      expect(copyMedia).not.toHaveBeenCalled();
      const uploadCalls = axiosPost.mock.calls.filter(([url]) =>
        url.endsWith(kind === "feed video" ? "/videos" : "/photos"),
      );
      expect(uploadCalls).toHaveLength(media.length);
      for (const [, body] of uploadCalls) {
        expect(kind === "feed video" ? body.file_url : body.url).toBe(medium.url);
      }
      expect(media).toEqual(originalMedia);
    });
  }
});

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

  test("does not retry a terminal auth error and asks for reconnection", async () => {
    videoStatusBehaviors = [
      () => {
        throw makeGraphReadBackError({
          code: 190,
          message: "Error validating access token: Session has expired",
          status: 400,
        });
      },
    ];

    const result = await publishVideo();

    expect(result.success).toBe(false);
    expect(result.error_message).toBe(
      "Account needs to be reconnected: Error validating access token: Session has expired",
    );
    expect(
      axiosGet.mock.calls.filter(([url]) => /\?fields=status$/.test(url)),
    ).toHaveLength(1);
    expect(innerRetryWaits()).toHaveLength(0);
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
