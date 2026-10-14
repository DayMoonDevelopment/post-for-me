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
