import { afterEach, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import axios, { type AxiosAdapter } from "axios";
import sharp from "sharp";
import { tasks, wait } from "@trigger.dev/sdk";
import * as mediaStorage from "../../media-storage";
import { InstagramPostClient } from "./instagram-post-client";
import { TikTokPostClient } from "./tiktok-post-client";
import { TikTokBusinessPostClient } from "./tiktok_business-post-client";
import type { PostMedia, SocialAccount } from "../post.types";

const originalAdapter = axios.defaults?.adapter;
const credentials = { app_id: "app-id", app_secret: "app-secret" };
const sourceUrl = "https://external.example.com/folder/photo.original.png?token=123";
const account = {
  id: "account-id",
  access_token: "token",
  social_provider_user_id: "user-id",
  social_provider_user_name: "tester",
} as SocialAccount;

const platforms = [
  { Client: InstagramPostClient, prefix: "instagram", width: 600, height: 600 },
  { Client: TikTokPostClient, prefix: "tiktok", width: 1080, height: 1080 },
  { Client: TikTokBusinessPostClient, prefix: "tiktok_business", width: 1080, height: 1080 },
];

// Existing platform tests globally mock Axios. Keep these real-image tests
// isolated from those mocks while restoring our own spies between cases.
if (!process.env.PFM_TRANSFORMED_IMAGE_TEST_CHILD) {
  test("transformed image storage in an isolated process", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      env: { ...process.env, PFM_TRANSFORMED_IMAGE_TEST_CHILD: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, output: exitCode === 0 ? "" : stdout + stderr }).toEqual({
      exitCode: 0,
      output: "",
    });
  });
} else {
  const definitions = new Map<string, {
    run(payload: any): Promise<unknown>;
    machine: string;
    retry: { maxAttempts: number; outOfMemory: { machine: string } };
  }>();
  mock.module("@trigger.dev/sdk", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const actual = require("@trigger.dev/sdk");
    return { ...actual, task: (definition: any) => {
      definitions.set(definition.id, definition);
      return definition;
    } };
  });
  beforeAll(async () => {
    await import("../../transform-instagram-image");
    await import("../../transform-tiktok-image");
  });

  test("image tasks use medium machines with one retry and large OOM escalation", () => {
    expect(definitions.size).toBe(2);
    for (const definition of definitions.values()) {
      expect(definition.machine).toBe("medium-1x");
      expect(definition.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
    }
  });

  for (const { Client, prefix, width, height } of platforms) {
  describe(`${Client.name} transformed image storage`, () => {
    const spies: Array<{ mockRestore(): void }> = [];
    afterEach(() => {
      axios.defaults.adapter = originalAdapter;
      for (const spy of spies.splice(0)) spy.mockRestore();
    });

    async function setup(imageWidth = 600, imageHeight = 600, orientation?: number) {
      const image = await sharp({
        create: { width: imageWidth, height: imageHeight, channels: 3, background: "red" },
      }).withMetadata({ orientation }).png().toBuffer();
      const downloads: string[] = [];
      const publications: any[] = [];
      const adapter: AxiosAdapter = async (config) => {
        const url = config.url!;
        let data: any;
        if (url === sourceUrl) {
          downloads.push(url);
          data = image;
        } else if (url.includes("/status/")) {
          data = JSON.stringify({ code: 0, data: { status: "PUBLISH_COMPLETE", publicaly_available_post_id: ["public-id"], post_ids: ["public-id"] } });
        } else if (config.method === "post") {
          const payload = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
          publications.push({ url, payload });
          data = { id: "container-id", code: 0, data: { creator_username: "tester", username: "tester", publish_id: "publish-id", share_id: "publish-id" } };
        } else {
          data = { status_code: "FINISHED", permalink: "https://instagram.com/p/test", code: 0, data: { creator_username: "tester", username: "tester" } };
        }
        return { data, status: 200, statusText: "OK", headers: {}, config };
      };
      axios.defaults.adapter = adapter;
      const upload = spyOn(mediaStorage, "uploadMedia").mockImplementation(
        async ({ key }) => `https://media.example.com/${key}`,
      );
      const child = spyOn(tasks, "triggerAndWait").mockImplementation((async (id: string, payload: unknown) => {
        const definition = definitions.get(id);
        if (!definition) throw new Error(`Unexpected child task: ${id}`);
        try {
          const output = await definition.run(JSON.parse(JSON.stringify(payload)));
          return { ok: true, output };
        } catch (error) {
          return { ok: false, error };
        }
      }) as typeof tasks.triggerAndWait);
      spies.push(upload, child, spyOn(wait, "for").mockResolvedValue(undefined));
      const client = new Client(credentials);
      const post = (overrides: Partial<PostMedia> = {}, platformConfig = {}, extraMedia: PostMedia[] = []) => client.post({
        postId: "post-id",
        account,
        caption: "caption",
        media: [{ id: "media-id", url: sourceUrl, type: "image", ...overrides }, ...extraMedia],
        platformConfig,
      });
      return { upload, child, post, downloads, publications };
    }

    test("uploads real transformed JPEG bytes and publishes the returned R2 URL with distinct UUID keys", async () => {
      const { upload, post, downloads, publications } = await setup();
      expect((await post()).success).toBe(true);
      expect((await post()).success).toBe(true);
      expect(upload).toHaveBeenCalledTimes(2);
      const keys: string[] = [];
      for (const [options] of upload.mock.calls) {
        keys.push(options.key);
        expect(options.key).toMatch(new RegExp(`^${prefix}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.jpg$`));
        expect(options.contentType).toBe("image/jpeg");
        expect(options.cacheControl).toBe("public, max-age=31536000");
        const metadata = await sharp(options.body as Buffer).metadata();
        expect(metadata.format).toBe("jpeg");
        expect(metadata.width).toBe(width);
        expect(metadata.height).toBe(height);
        expect(JSON.stringify(publications)).toContain(`https://media.example.com/${options.key}`);
      }
      expect(new Set(keys).size).toBe(2);
      expect(downloads).toHaveLength(2);
    });

    test("reports upload failures without publishing the original image", async () => {
      const { upload, post, publications } = await setup();
      upload.mockRejectedValue(new Error("R2 upload unavailable"));
      const result = await post();
      expect(result.success).toBe(false);
      if (prefix === "instagram") {
         expect(result.error_message).toContain("Failed to transform Instagram image");
      } else {
        expect(result.error_message).toBe("Failed to post to TikTok");
        expect(result.details).toMatchObject({ error: { message: prefix === "tiktok" ? "Failed to transform TikTok image" : "Failed to transform TikTok Business image" } });
      }
      expect(upload).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(publications)).not.toContain(sourceUrl);
      expect(JSON.stringify(publications)).not.toContain("photo_images");
      expect(JSON.stringify(publications)).not.toContain("image_url");
    });

    test("skip_processing publishes the original URL without downloading or uploading", async () => {
      const { upload, child, post, downloads, publications } = await setup();
      expect((await post({ skip_processing: true })).success).toBe(true);
      expect(upload).not.toHaveBeenCalled();
      expect(child).not.toHaveBeenCalled();
      expect(downloads).toHaveLength(0);
      expect(JSON.stringify(publications)).toContain(sourceUrl);
    });

    for (const failure of ["failed result", "rejection"]) {
      test(`child ${failure} prevents in-process fallback and publication`, async () => {
        const { child, upload, post, downloads, publications } = await setup();
        if (failure === "failed result") child.mockResolvedValue({ ok: false, error: { message: "child failed" } } as any);
        else child.mockRejectedValue(new Error("child rejected"));
        expect((await post()).success).toBe(false);
        expect(child).toHaveBeenCalledTimes(1);
        expect(upload).not.toHaveBeenCalled();
        expect(downloads).toHaveLength(0);
        expect(JSON.stringify(publications)).not.toContain("image_url");
        expect(JSON.stringify(publications)).not.toContain("photo_images");
      });
    }

    if (prefix === "instagram") {
      for (const [placement, expectedHeight] of [["feed", 800], ["stories", 1067]] as const) {
        test(`preserves ${placement} cropping and returned carousel dimensions across the child boundary`, async () => {
          const { child, upload, post } = await setup(600, 1200);
          expect((await post({}, { placement }, [{ id: "second", url: sourceUrl, type: "image" }])).success).toBe(true);
          expect(child).toHaveBeenCalledTimes(2);
          expect(child.mock.calls[1][1]).toMatchObject({
            options: { firstImage: { width: 600, height: expectedHeight }, placement, is_feed: true },
          });
          for (const [options] of upload.mock.calls) {
            expect(await sharp(options.body as Buffer).metadata()).toMatchObject({ width: 600, height: expectedHeight });
          }
        });
      }
      test("preserves reel cover placement and share_to_feed options", async () => {
        const { child, upload, post } = await setup(600, 1200);
        expect((await post({ type: "video", thumbnail_url: sourceUrl }, { placement: "reels", share_to_feed: false })).success).toBe(true);
        expect(child.mock.calls[0][1]).toMatchObject({ options: { placement: "reels", is_feed: false } });
        expect(await sharp(upload.mock.calls[0][0].body as Buffer).metadata()).toMatchObject({ width: 600, height: 1067 });
      });
    } else {
      for (const [imageWidth, imageHeight, orientation, targetWidth, targetHeight] of [
        [600, 1200, 1, 1080, 1920],
        [1200, 600, 1, 1920, 1080],
        [1200, 600, 6, 1080, 1920],
        [600, 800, 1, 1080, 1440],
      ]) {
        test(`preserves nearest-ratio crop for ${imageWidth}x${imageHeight} orientation ${orientation}`, async () => {
          const { upload, post } = await setup(imageWidth, imageHeight, orientation);
          expect((await post()).success).toBe(true);
          expect(await sharp(upload.mock.calls[0][0].body as Buffer).metadata()).toMatchObject({ width: targetWidth, height: targetHeight });
        });
      }
    }
  });
  }
}
