import { afterEach, beforeAll, expect, spyOn, test } from "bun:test";
import type { PostMedia, SocialAccount } from "../post.types";

// Other platform suites mock Axios/Trigger globally; keep these spies isolated.
if (!process.env.PFM_TIKTOK_BUSINESS_MEDIA_TEST_CHILD) {
  test("TikTok Business photo storage in an isolated process", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      env: { ...process.env, PFM_TIKTOK_BUSINESS_MEDIA_TEST_CHILD: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, output: exitCode === 0 ? "" : stdout + stderr }).toEqual(
      {
        exitCode: 0,
        output: "",
      },
    );
  });
} else {
  let axios: typeof import("axios").default;
  let tasks: typeof import("@trigger.dev/sdk").tasks;
  let wait: typeof import("@trigger.dev/sdk").wait;
  let Client: typeof import("./tiktok_business-post-client").TikTokBusinessPostClient;
  let originalAdapter: typeof axios.defaults.adapter;
  const spies: Array<{ mockRestore(): void }> = [];
  const sourceUrl = "https://storage.postforme.cloud/source.jpg";
  const transformedUrl = "https://storage.postforme.cloud/transformed.jpg";
  const publicBase =
    "https://data.postforme.dev/storage/v1/object/public/post-media";
  const account = {
    id: "account-id",
    access_token: "token",
    social_provider_user_id: "business-id",
  } as SocialAccount;

  beforeAll(async () => {
    ({ default: axios } = await import("axios"));
    ({ tasks, wait } = await import("@trigger.dev/sdk"));
    ({ TikTokBusinessPostClient: Client } =
      await import("./tiktok_business-post-client"));
    originalAdapter = axios.defaults.adapter;
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  function setup(statuses = ["PUBLISH_COMPLETE"]) {
    const publications: Array<{ url: string; payload: any }> = [];
    const events: string[] = [];
    let copies = 0;
    let polls = 0;
    axios.defaults.adapter = async (config) => {
      const url = config.url!;
      let data: any;
      if (url.includes("/business/get/")) {
        data = { code: 0, data: { username: "tester" } };
      } else if (url.includes("/publish/status/")) {
        const status = statuses[Math.min(polls++, statuses.length - 1)];
        data = JSON.stringify({
          code: 0,
          data: {
            status,
            post_ids: status === "PUBLISH_COMPLETE" ? ["public-id"] : undefined,
          },
        });
      } else if (config.method === "post") {
        events.push("publish");
        publications.push({ url, payload: JSON.parse(config.data) });
        data = { code: 0, data: { share_id: "publish-id" } };
      } else {
        throw new Error(`Unexpected request: ${url}`);
      }
      return { data, status: 200, statusText: "OK", headers: {}, config };
    };
    const child = spyOn(tasks, "triggerAndWait").mockImplementation((async (
      id: string,
    ) => {
      events.push(id);
      if (id === "transform-tiktok-image")
        return { ok: true, output: transformedUrl };
      expect(id).toBe("copy-media-to-supabase");
      return { ok: true, output: `${publicBase}/copy-${++copies}.jpg` };
    }) as unknown as typeof tasks.triggerAndWait);
    const delay = spyOn(wait, "for").mockResolvedValue(undefined);
    spies.push(child, delay);
    const post = (
      media: PostMedia[] = [{ id: "image", type: "image", url: sourceUrl }],
      platformConfig = {},
    ) =>
      new Client({ app_id: "app-id", app_secret: "app-secret" }).post({
        postId: "post-id",
        account,
        caption: "caption",
        media,
        platformConfig,
      });
    return { post, child, publications, events, delay };
  }

  test("copies final transformed photos before publishing, then polls the same publish ID", async () => {
    const { post, child, publications, events, delay } = setup([
      "PROCESSING_DOWNLOAD",
      "PUBLISH_COMPLETE",
    ]);
    expect(await post()).toMatchObject({
      success: true,
      provider_post_id: "public-id",
    });
    expect(child).toHaveBeenCalledWith(
      "transform-tiktok-image",
      expect.objectContaining({
        signedUrl: sourceUrl,
        platform: "tiktok_business",
        maxFileSize: 20 * 1024 * 1024,
      }),
    );
    expect(child).toHaveBeenCalledWith("copy-media-to-supabase", {
      url: transformedUrl,
    });
    expect(events).toEqual([
      "transform-tiktok-image",
      "copy-media-to-supabase",
      "publish",
    ]);
    expect(publications).toHaveLength(1);
    expect(publications[0].url).toEndWith("/business/photo/publish/");
    expect(publications[0].payload.photo_images).toEqual([
      `${publicBase}/copy-1.jpg`,
    ]);
    expect(delay).toHaveBeenCalledTimes(1);
  });

  for (const isDraft of [false, true]) {
    test(`skip_processing carousel copies every original photo in order (draft=${isDraft})`, async () => {
      const { post, child, publications } = setup([
        isDraft ? "SEND_TO_USER_INBOX" : "PUBLISH_COMPLETE",
      ]);
      const urls = [
        sourceUrl,
        "https://external.example.com/second.jpg?token=123",
      ];
      const result = await post(
        urls.map((url, index) => ({
          id: `image-${index}`,
          type: "image",
          url,
          skip_processing: true,
        })),
        { is_draft: isDraft },
      );
      expect(result.success).toBe(true);
      expect(child.mock.calls).toEqual(
        urls.map((url) => ["copy-media-to-supabase", { url }]),
      );
      expect(publications[0].payload).toMatchObject({
        photo_images: [`${publicBase}/copy-1.jpg`, `${publicBase}/copy-2.jpg`],
        photo_cover_index: 0,
      });
      expect(publications[0].payload.post_info.is_draft).toBe(
        isDraft ? true : undefined,
      );
    });
  }

  for (const failure of ["failed result", "rejection"]) {
    test(`copy ${failure} stops publication, including a partially copied carousel`, async () => {
      const { post, child, publications } = setup();
      child.mockResolvedValueOnce({
        ok: true,
        output: `${publicBase}/first.jpg`,
      } as any);
      if (failure === "failed result") {
        child.mockResolvedValueOnce({
          ok: false,
          error: { message: "unavailable" },
        } as any);
      } else {
        child.mockRejectedValueOnce(new Error("copy unavailable"));
      }
      const result = await post(
        [1, 2].map((id) => ({
          id: String(id),
          type: "image",
          url: sourceUrl,
          skip_processing: true,
        })),
      );
      expect(result.success).toBe(false);
      expect(result.details).toMatchObject({
        error: {
          message:
            failure === "failed result"
              ? "Failed to copy TikTok Business photo to Supabase"
              : "copy unavailable",
        },
      });
      expect(child).toHaveBeenCalledTimes(2);
      expect(publications).toEqual([]);
    });
  }

  test("video URL and custom thumbnail remain unchanged, with no copy or transform task", async () => {
    const { post, child, publications } = setup();
    const videoUrl = "https://storage.postforme.cloud/video.mp4";
    const thumbnailUrl = "https://storage.postforme.cloud/thumbnail.jpg";
    expect(
      (
        await post([
          {
            id: "video",
            type: "video",
            url: videoUrl,
            thumbnail_url: thumbnailUrl,
          },
        ])
      ).success,
    ).toBe(true);
    expect(child).not.toHaveBeenCalled();
    expect(publications).toHaveLength(1);
    expect(publications[0].url).toEndWith("/business/video/publish/");
    expect(publications[0].payload).toMatchObject({
      video_url: videoUrl,
      custom_thumbnail_url: thumbnailUrl,
    });
  });
}
