import { afterEach, beforeAll, expect, mock, spyOn, test } from "bun:test";
import type { PostMedia, SocialAccount } from "../post.types";

if (!process.env.PFM_TIKTOK_MEDIA_TEST_CHILD) {
  test("TikTok Supabase media in an isolated process", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      env: { ...process.env, PFM_TIKTOK_MEDIA_TEST_CHILD: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, output: exitCode === 0 ? "" : stdout + stderr }).toEqual({ exitCode: 0, output: "" });
  });
} else {
  let axios: typeof import("axios").default;
  let sharp: typeof import("sharp");
  let tasks: typeof import("@trigger.dev/sdk").tasks;
  let storage: typeof import("../../media-storage");
  let TikTokPostClient: typeof import("./tiktok-post-client").TikTokPostClient;
  let originalAdapter: typeof axios.defaults.adapter;
  let videoRun: (payload: any, context: any) => Promise<any>;
  beforeAll(async () => {
    ({ default: axios } = await import("axios"));
    ({ default: sharp } = await import("sharp"));
    ({ tasks } = await import("@trigger.dev/sdk"));
    mock.module("@trigger.dev/sdk", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const actual = require("@trigger.dev/sdk");
      return { ...actual, task: (definition: any) => {
        if (definition.id === "upload-tiktok-video") videoRun = definition.run;
        return definition;
      } };
    });
    ({ tasks } = await import("@trigger.dev/sdk"));
    await import("../../upload-tiktok-video");
    storage = await import("../../media-storage");
    ({ TikTokPostClient } = await import("./tiktok-post-client"));
    originalAdapter = axios.defaults.adapter;
  });
  const sourceUrl = "https://external.example.com/photo.png?token=123";
  const supabaseUrl = "https://example.supabase.co/storage/v1/object/public/post-media/copied.jpg";
  const credentials = { app_id: "app-id", app_secret: "app-secret" };
  const account = { id: "account-id", access_token: "token" } as SocialAccount;
  const spies: Array<{ mockRestore(): void }> = [];
  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  async function setup(useSupabaseMedia?: boolean) {
    const image = await sharp({ create: { width: 600, height: 600, channels: 3, background: "red" } }).png().toBuffer();
    const downloads: string[] = [];
    const publications: Array<{ url: string; payload: any }> = [];
    const events: string[] = [];
    let inChild = false;
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (url: RequestInfo | URL) => {
      expect(inChild).toBe(true);
      events.push(`download:${url}`);
      return new Response("data", { headers: { "content-type": "video/mp4" } });
    }) as typeof fetch);
    spies.push(fetchSpy);
    axios.defaults.adapter = async (config) => {
      const url = config.url!;
      let data: any;
      if (url === sourceUrl) {
        downloads.push(url);
        data = image;
      } else if (url.includes("/status/")) {
        data = JSON.stringify({ data: { status: "PUBLISH_COMPLETE", publicaly_available_post_id: ["public-id"] } });
      } else if (url.includes("/creator_info/")) {
        data = { data: { creator_username: "tester" } };
      } else if (config.method === "put") {
        for await (const _chunk of config.data) { /* Consume the upload stream. */ }
        events.push("upload-video");
        data = {};
      } else if (url.includes("/init/")) {
        events.push("publish");
        publications.push({ url, payload: JSON.parse(config.data) });
        data = { data: { publish_id: "publish-id", upload_url: "https://upload.example.com/video" } };
      } else {
        throw new Error(`Unexpected request: ${url}`);
      }
      return { data, status: 200, statusText: "OK", headers: {}, config };
    };
    const upload = spyOn(storage, "uploadMedia").mockImplementation(async ({ key }) => {
      events.push("transform-upload");
      return `https://media.example.com/${key}`;
    });
    const copy = spyOn(tasks, "triggerAndWait").mockImplementation((async (id: string, payload: any) => {
      if (id === "transform-live-image") {
        // Simulate a completed Zenith output; the copy must use this URL, never the source.
        const body = await sharp(image).resize(1080, 1080).jpeg().toBuffer();
        const url = await storage.uploadMedia({ key: "tiktok_1234-abcd.jpg", body, contentType: "image/jpeg" });
        return { ok: true, output: { url } };
      }
      if (id === "upload-tiktok-video") {
        inChild = true;
        try {
          return { ok: true, output: JSON.parse(JSON.stringify(await videoRun(
            JSON.parse(JSON.stringify(payload)), { ctx: { attempt: { number: 2 } } },
          ))) };
        } finally { inChild = false; }
      }
      expect(id).toBe("copy-media-to-supabase");
      events.push("copy");
      return { ok: true, output: supabaseUrl } as any;
    }) as unknown as typeof tasks.triggerAndWait);
    spies.push(upload, copy);
    const post = (overrides: Partial<PostMedia> = {}) => {
      const client = useSupabaseMedia === undefined
        ? new TikTokPostClient(credentials)
        : new TikTokPostClient(credentials, useSupabaseMedia);
      spies.push(spyOn(client as any, "downloadToTempFile").mockImplementation(() => {
        throw new Error("Parent must not stage video");
      }));
      return client.post({
        postId: "post-id", account, caption: "caption", platformConfig: {},
        media: [{ id: "media-id", url: sourceUrl, type: "image", ...overrides }],
      });
    };
    return { post, upload, copy, downloads, publications, events };
  }

  test("copies the final transformed R2 JPEG, then publishes only the Supabase URL", async () => {
    const { post, upload, copy, publications, events } = await setup(true);
    expect((await post()).success).toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
    const options = upload.mock.calls[0][0];
    expect(options.key).toMatch(/^tiktok_[0-9a-f-]+\.jpg$/);
    expect(options.contentType).toBe("image/jpeg");
    expect(await sharp(options.body as Buffer).metadata()).toMatchObject({ format: "jpeg", width: 1080, height: 1080 });
    expect(copy).toHaveBeenCalledTimes(2);
    expect(copy).toHaveBeenCalledWith("copy-media-to-supabase", { url: `https://media.example.com/${options.key}` });
    expect(publications).toHaveLength(1);
    expect(publications[0].payload.source_info).toEqual({ source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: [supabaseUrl] });
    expect(events).toEqual(["transform-upload", "copy", "publish"]);
  });

  test("skip_processing still copies the original URL without transforming", async () => {
    const { post, upload, copy, downloads, publications } = await setup(true);
    expect((await post({ skip_processing: true })).success).toBe(true);
    expect(upload).not.toHaveBeenCalled();
    expect(downloads).toEqual([]);
    expect(copy).toHaveBeenCalledWith("copy-media-to-supabase", { url: sourceUrl });
    expect(publications[0].payload.source_info.photo_images).toEqual([supabaseUrl]);
  });

  for (const flag of [false, undefined]) {
    test(`storage flag ${flag} keeps transformed R2 URLs without a copy task`, async () => {
      const { post, upload, copy, publications } = await setup(flag);
      expect((await post()).success).toBe(true);
      expect(upload).toHaveBeenCalledTimes(1);
      expect(copy).toHaveBeenCalledTimes(1);
      expect(copy.mock.calls[0][0]).toBe("transform-live-image");
      expect(publications[0].payload.source_info.photo_images).toEqual([`https://media.example.com/${upload.mock.calls[0][0].key}`]);
    });
  }

  for (const failure of ["task failure", "rejection"]) {
    for (const type of ["image", "video"] as const) {
      test(`${failure} copying ${type} prevents publication and video download`, async () => {
        const { post, copy, publications, events } = await setup(true);
        if (failure === "task failure") copy.mockResolvedValue({ ok: false, error: { message: "copy unavailable" } } as any);
        else copy.mockRejectedValue(new Error("copy unavailable"));
        const result = await post({ type, skip_processing: true });
        expect(result.success).toBe(false);
        expect(result.details).toMatchObject({ error: { message: failure === "task failure" ? "Failed to copy TikTok media to Supabase" : "copy unavailable" } });
        expect(copy).toHaveBeenCalledWith("copy-media-to-supabase", { url: sourceUrl });
        expect(publications).toEqual([]);
        expect(events).toEqual([]);
      });
    }
  }

  for (const flag of [true, false]) {
    test(`video storage flag ${flag} resolves the download source and retains FILE_UPLOAD`, async () => {
      const { post, copy, publications, events } = await setup(flag);
      expect((await post({ type: "video" })).success).toBe(true);
      if (flag) expect(copy).toHaveBeenCalledWith("copy-media-to-supabase", { url: sourceUrl });
      else expect(copy).toHaveBeenCalledTimes(1);
      expect(copy).toHaveBeenCalledWith("upload-tiktok-video", expect.objectContaining({ url: flag ? supabaseUrl : sourceUrl }));
      expect(events).toEqual([...(flag ? ["copy"] : []), `download:${flag ? supabaseUrl : sourceUrl}`, "publish", "upload-video"]);
      expect(publications[0].url).toEndWith("/video/init/");
      expect(publications[0].payload.source_info).toEqual({ source: "FILE_UPLOAD", video_size: 4, chunk_size: 4, total_chunk_count: 1 });
    });
  }
}
