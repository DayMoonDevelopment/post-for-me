import { afterEach, describe, expect, spyOn, test } from "bun:test";
import axios, { type AxiosAdapter } from "axios";
import sharp from "sharp";
import { wait } from "@trigger.dev/sdk";
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
} else for (const { Client, prefix, width, height } of platforms) {
  describe(`${Client.name} transformed image storage`, () => {
    const spies: Array<{ mockRestore(): void }> = [];
    afterEach(() => {
      axios.defaults.adapter = originalAdapter;
      for (const spy of spies.splice(0)) spy.mockRestore();
    });

    async function setup() {
      const image = await sharp({
        create: { width: 600, height: 600, channels: 3, background: "red" },
      }).png().toBuffer();
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
      spies.push(upload, spyOn(wait, "for").mockResolvedValue(undefined));
      const client = new Client(credentials);
      const post = (overrides: Partial<PostMedia> = {}) => client.post({
        postId: "post-id",
        account,
        caption: "caption",
        media: [{ id: "media-id", url: sourceUrl, type: "image", ...overrides }],
        platformConfig: {},
      });
      return { upload, post, downloads, publications };
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
        expect(result.error_message).toContain("R2 upload unavailable");
      } else {
        expect(result.error_message).toBe("Failed to post to TikTok");
        expect(result.details).toMatchObject({ error: { message: "R2 upload unavailable" } });
      }
      expect(upload).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(publications)).not.toContain(sourceUrl);
      expect(JSON.stringify(publications)).not.toContain("photo_images");
      expect(JSON.stringify(publications)).not.toContain("image_url");
    });

    test("skip_processing publishes the original URL without downloading or uploading", async () => {
      const { upload, post, downloads, publications } = await setup();
      expect((await post({ skip_processing: true })).success).toBe(true);
      expect(upload).not.toHaveBeenCalled();
      expect(downloads).toHaveLength(0);
      expect(JSON.stringify(publications)).toContain(sourceUrl);
    });
  });
}
