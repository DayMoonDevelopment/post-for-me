import { afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { PostMedia, SocialAccount } from "../post.types";
import type { ThreadsPostClient as ThreadsPostClientType } from "./threads-post-client";

const axiosGet = mock();
const axiosPost = mock();

mock.module("axios", () => ({
  default: { get: axiosGet, post: axiosPost },
}));

mock.module("@trigger.dev/sdk", () => ({
  wait: { for: mock(async () => undefined) },
}));

// Imported dynamically (after the mocks above are registered) so
// threads-post-client.ts picks up the mocked axios/@trigger.dev/sdk modules.
let ThreadsPostClient: typeof ThreadsPostClientType;

beforeAll(async () => {
  ({ ThreadsPostClient } = await import("./threads-post-client"));
});

function makeAccount(): SocialAccount {
  return {
    provider: "threads",
    id: "connection-1",
    social_provider_user_name: "tester",
    access_token: "token",
    refresh_token: null,
    access_token_expires_at: null,
    refresh_token_expires_at: null,
    social_provider_user_id: "user-1",
    social_provider_metadata: null,
  };
}

function imageMedia(id = "media-image"): PostMedia {
  return { id, url: "https://example.com/image.webp", type: "image" };
}

function videoMedia(id = "media-video"): PostMedia {
  return { id, url: "https://example.com/video.mp4", type: "video" };
}

/**
 * Wires axios.post to hand back a distinct container id per carousel item
 * ("item-1", "item-2", ...), a fixed id for the CAROUSEL assembly call, and a
 * fixed platform id for the publish call, while recording call order in `events`.
 */
function mockContainerLifecycle(events: string[]) {
  let itemCounter = 0;
  axiosPost.mockImplementation(async (url: string, body: any) => {
    if (body?.media_type === "CAROUSEL") {
      events.push("carousel-create");
      return { data: { id: "carousel-container-id" } };
    }
    if (typeof url === "string" && url.includes("threads_publish")) {
      events.push("publish");
      return { data: { id: "platform-post-id" } };
    }
    itemCounter += 1;
    events.push(`item-create:${body?.media_type}`);
    return { data: { id: `item-${itemCounter}` } };
  });
}

beforeEach(() => {
  axiosGet.mockReset();
  axiosPost.mockReset();
});

afterEach(() => {
  axiosGet.mockReset();
  axiosPost.mockReset();
});

describe("ThreadsPostClient#processCarousel status polling", () => {
  test("waits for a video carousel child to reach FINISHED before assembling the carousel", async () => {
    const events: string[] = [];
    mockContainerLifecycle(events);

    let videoStatusCalls = 0;
    axiosGet.mockImplementation(async (url: string) => {
      events.push(`status:${url}`);
      if (url === "https://graph.threads.net/v1.0/item-2") {
        videoStatusCalls += 1;
        return {
          data: { status: videoStatusCalls === 1 ? "IN_PROGRESS" : "FINISHED" },
        };
      }
      if (url === "https://graph.threads.net/v1.0/platform-post-id") {
        return { data: { permalink: "https://threads.net/p/123" } };
      }
      return { data: { status: "FINISHED" } };
    });

    const client = new ThreadsPostClient({} as any, {} as any);
    const result = await client.post({
      postId: "post-1",
      account: makeAccount(),
      caption: "hello",
      media: [imageMedia(), videoMedia()],
      platformConfig: {},
    });

    expect(result.success).toBe(true);
    // Video child had to be polled twice (IN_PROGRESS, then FINISHED) before
    // the carousel could be assembled — this is the behavior PFM-1110 fixes.
    expect(videoStatusCalls).toBe(2);

    const carouselIndex = events.indexOf("carousel-create");
    const lastItemStatusIndex = Math.max(
      events.lastIndexOf("status:https://graph.threads.net/v1.0/item-1"),
      events.lastIndexOf("status:https://graph.threads.net/v1.0/item-2"),
    );
    expect(carouselIndex).toBeGreaterThan(lastItemStatusIndex);
  });

  test("fails the whole post when a carousel video child errors out", async () => {
    mockContainerLifecycle([]);
    axiosGet.mockImplementation(async () => ({
      data: { status: "ERROR", error_message: "transcoding failed" },
    }));

    const client = new ThreadsPostClient({} as any, {} as any);
    const result = await client.post({
      postId: "post-1",
      account: makeAccount(),
      caption: "hello",
      media: [imageMedia(), videoMedia()],
      platformConfig: {},
    });

    expect(result.success).toBe(false);
    expect(result.error_message).toContain("Container processing failed");
    expect(result.error_message).toContain("carousel");
    expect(result.error_message).toContain("transcoding failed");
  });

  test("times out if a carousel child never reaches FINISHED", async () => {
    mockContainerLifecycle([]);
    axiosGet.mockImplementation(async () => ({ data: { status: "IN_PROGRESS" } }));

    const client = new ThreadsPostClient({} as any, {} as any);
    const result = await client.post({
      postId: "post-1",
      account: makeAccount(),
      caption: "hello",
      media: [videoMedia(), imageMedia()],
      platformConfig: {},
    });

    expect(result.success).toBe(false);
    expect(result.error_message).toContain("Container processing timed out");
    expect(result.error_message).toContain("carousel video item 1");
  });
});

describe("ThreadsPostClient#processMedia status polling (regression)", () => {
  test("single video post still polls status until FINISHED and returns success", async () => {
    axiosPost.mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("threads_publish")) {
        return { data: { id: "platform-post-id" } };
      }
      return { data: { id: "solo-container" } };
    });

    let statusCalls = 0;
    axiosGet.mockImplementation(async (url: string) => {
      if (url === "https://graph.threads.net/v1.0/solo-container") {
        statusCalls += 1;
        return { data: { status: statusCalls < 2 ? "IN_PROGRESS" : "FINISHED" } };
      }
      return { data: { permalink: "https://threads.net/p/solo" } };
    });

    const client = new ThreadsPostClient({} as any, {} as any);
    const result = await client.post({
      postId: "post-1",
      account: makeAccount(),
      caption: "hello",
      media: [videoMedia()],
      platformConfig: {},
    });

    expect(result.success).toBe(true);
    expect(statusCalls).toBe(2);
  });
});
