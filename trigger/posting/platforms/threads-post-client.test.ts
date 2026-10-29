import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import type { Mock } from "bun:test";
import axios from "axios";
import { wait } from "@trigger.dev/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ThreadsPostClient } from "./threads-post-client";
import type { PostMedia, SocialAccount } from "../post.types";

const account: SocialAccount = {
  id: "account-1",
  provider: "threads",
  social_provider_user_id: "threads-user-1",
  social_provider_user_name: "test-user",
  access_token: "access-token",
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_metadata: {},
};

let postSpy: Mock<(url: string, body?: any, config?: any) => Promise<any>>;
let getSpy: Mock<(url: string, config?: any) => Promise<any>>;
let waitSpy: Mock<typeof wait.for>;

beforeEach(() => {
  postSpy = spyOn(axios, "post");
  getSpy = spyOn(axios, "get");
  waitSpy = spyOn(wait, "for");
  postSpy.mockReset();
  getSpy.mockReset();
  waitSpy.mockReset();
  let itemCount = 0;
  postSpy.mockImplementation(async (url: string, body?: any) => {
    if (url.endsWith("/threads_publish")) {
      return { data: { id: "published-post" } };
    }
    if (body?.is_carousel_item) {
      return { data: { id: `item-${++itemCount}` } };
    }
    return { data: { id: "container" } };
  });
  getSpy.mockImplementation(async (_url: string, config?: any) => ({
    data:
      config?.params?.fields === "status,error_message"
        ? { status: "FINISHED" }
        : {
            permalink: "https://www.threads.net/@test-user/post/published-post",
          },
  }));
  waitSpy.mockResolvedValue(undefined);
});

afterEach(() => {
  postSpy.mockRestore();
  getSpy.mockRestore();
  waitSpy.mockRestore();
});

function makeMedia(count: number, mixed = false): PostMedia[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `media-${index}`,
    url: `https://example.com/media-${index}`,
    type: mixed && index % 2 ? "video" : "image",
    alt_text: `Media ${index}`,
  }));
}

function publish(media: PostMedia[]) {
  const client = new ThreadsPostClient({} as SupabaseClient, {
    app_id: "app-id",
    app_secret: "app-secret",
  });
  return client.post({
    postId: "post-1",
    account,
    caption: "Carousel caption",
    media,
    platformConfig: {},
  });
}

describe("Threads carousel media limit", () => {
  for (const { count, mixed } of [
    { count: 2, mixed: false },
    { count: 5, mixed: false },
    { count: 20, mixed: false },
    { count: 20, mixed: true },
    { count: 21, mixed: false },
    { count: 25, mixed: true },
  ]) {
    test(`publishes the first ${Math.min(count, 20)} of ${count} ${mixed ? "mixed" : "image"} items in order`, async () => {
      const media = makeMedia(count, mixed);
      const originalMedia = structuredClone(media);
      const result = await publish(media);
      const allowedMedia = media.slice(0, 20);
      const itemCalls = postSpy.mock.calls.filter(
        ([, body]) => body?.is_carousel_item,
      );
      const carouselCall = postSpy.mock.calls.find(
        ([, body]) => body?.media_type === "CAROUSEL",
      );

      expect(result.success).toBe(true);
      expect(result.provider_post_id).toBe("published-post");
      expect(itemCalls).toHaveLength(allowedMedia.length);
      expect(itemCalls.map(([, body]) => body)).toEqual(
        allowedMedia.map((medium) => ({
          media_type: medium.type === "video" ? "VIDEO" : "IMAGE",
          [medium.type === "video" ? "video_url" : "image_url"]: medium.url,
          alt_text: medium.alt_text,
          is_carousel_item: true,
        })),
      );
      expect(carouselCall?.[1]).toEqual({
        media_type: "CAROUSEL",
        children: allowedMedia.map((_, index) => `item-${index + 1}`).join(","),
        text: "Carousel caption",
      });
      expect(result.details.warning).toBe(
        count > 20 ? "Only first 20 items were posted" : null,
      );
      expect(
        result.details.requests.filter(
          (entry: any) => entry.carouselItemRequest,
        ),
      ).toHaveLength(allowedMedia.length);
      expect(media).toEqual(originalMedia);
    });
  }

  for (const count of [0, 1]) {
    test(`keeps ${count === 0 ? "text-only" : "single-media"} posts unchanged without a warning`, async () => {
      const result = await publish(makeMedia(count));

      expect(result.success).toBe(true);
      expect(result.details.warning).toBeNull();
      expect(postSpy.mock.calls[0][1]?.media_type).toBe(
        count === 0 ? "TEXT" : "IMAGE",
      );
      expect(
        postSpy.mock.calls.some(([, body]) => body?.is_carousel_item),
      ).toBe(false);
    });
  }
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
  postSpy.mockImplementation(async (url: string, body: any) => {
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

describe("ThreadsPostClient#processCarousel status polling", () => {
  test("waits for a video carousel child to reach FINISHED before assembling the carousel", async () => {
    const events: string[] = [];
    mockContainerLifecycle(events);

    let videoStatusCalls = 0;
    getSpy.mockImplementation(async (url: string) => {
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
    getSpy.mockImplementation(async () => ({
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
    getSpy.mockImplementation(async () => ({ data: { status: "IN_PROGRESS" } }));

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
    postSpy.mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("threads_publish")) {
        return { data: { id: "platform-post-id" } };
      }
      return { data: { id: "solo-container" } };
    });

    let statusCalls = 0;
    getSpy.mockImplementation(async (url: string) => {
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
