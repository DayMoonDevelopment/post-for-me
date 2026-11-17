import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type {
  SocialAccount,
  TiktokBusinessConfiguration,
  PostMedia,
} from "../post.types";

const axiosPost = mock(async (_url: string, _payload: any, _config?: any) => ({
  data: { code: 0, data: { share_id: "share_1" } },
}));
const axiosGet = mock(async (url: string, _config?: any) => {
  if (url.includes("/business/get/")) {
    return { data: { code: 0, data: { username: "creator" } } };
  }
  return {
    data: JSON.stringify({
      code: 0,
      data: { status: "PUBLISH_COMPLETE", post_ids: ["99999999999999999999"] },
    }),
  };
});
mock.module("axios", () => ({ default: { get: axiosGet, post: axiosPost } }));

let TikTokBusinessPostClient: typeof import("./tiktok_business-post-client").TikTokBusinessPostClient;
beforeAll(async () => {
  ({ TikTokBusinessPostClient } =
    await import("./tiktok_business-post-client"));
});
beforeEach(() => {
  axiosPost.mockClear();
  axiosGet.mockClear();
});

const account: SocialAccount = {
  provider: "tiktok",
  id: "spc_1",
  social_provider_user_name: "creator",
  access_token: "token",
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "business_1",
  social_provider_metadata: null,
};
const video: PostMedia = {
  id: "media_1",
  type: "video",
  url: "https://cdn.example.com/video.mp4",
};
const photo: PostMedia = {
  id: "photo_1",
  type: "image",
  url: "https://cdn.example.com/photo.jpg",
  skip_processing: true,
};
const publish = (
  platformConfig: TiktokBusinessConfiguration,
  media = [video],
) =>
  new TikTokBusinessPostClient({
    app_id: "app",
    app_secret: "secret",
  }).post({
    postId: "post_1",
    account,
    caption: "caption",
    media,
    platformConfig,
  });

describe("TikTokBusinessPostClient audio selection", () => {
  test("sends clip selection under post_info and preserves IDs, zero volumes, and millisecond offsets", async () => {
    const audio = {
      music_sound_id: "88888888888888888888",
      music_sound_volume: 0,
      music_sound_start: 0,
      music_sound_end: 5000,
      video_original_sound_volume: 0,
    };
    const result = await publish({ music_sound_info: audio });
    expect(result.success).toBe(true);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, payload, config] = axiosPost.mock.calls[0];
    expect(url).toEndWith("/business/video/publish/");
    expect(payload.post_info.music_sound_info).toEqual(audio);
    expect(payload).not.toHaveProperty("music_sound_info");
    expect(config.headers["Access-Token"]).toBe("token");
  });

  test("leaves requests unchanged without a selection", async () => {
    expect((await publish({})).success).toBe(true);
    expect(axiosPost.mock.calls[0][1].post_info).not.toHaveProperty(
      "music_sound_info",
    );
  });

  test.each([
    { is_draft: true, media: [video] },
    { is_draft: true, media: [photo] },
    { media: [video, video] },
    { media: [video, { ...video, type: "image" }] },
  ])(
    "ignores audio for unsupported media and drafts: %j",
    async ({ media, ...config }) => {
      // Malformed selection must be ignored too, without changing the caller's config.
      const platformConfig = {
        ...config,
        music_sound_info: {},
      } as TiktokBusinessConfiguration;
      const originalAudio = platformConfig.music_sound_info;
      const result = await publish(platformConfig, [...media]);
      expect(result.success).toBe(true);
      expect(result.details.audio_ignored_reason).toContain("single video");
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost.mock.calls[0][1].post_info).not.toHaveProperty(
        "music_sound_info",
      );
      expect(platformConfig.music_sound_info).toBe(originalAudio);
    },
  );

  test("preserves the existing no-media error instead of validating audio", async () => {
    const result = await publish(
      { music_sound_info: {} } as TiktokBusinessConfiguration,
      [],
    );
    expect(result.success).toBe(false);
    expect(result.error_message).toBe("No files provided");
    expect(axiosPost).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  test.each([1, 3])(
    "sends explicit music for %i photos using only the track ID",
    async (count) => {
      const media = Array.from({ length: count }, (_, index) => ({
        ...photo,
        id: `photo_${index}`,
      }));
      const result = await publish(
        {
          auto_add_music: true,
          music_sound_info: {
            music_sound_id: "99999999999999999999",
            music_sound_volume: 50,
            music_sound_start: 0,
            music_sound_end: 5000,
            video_original_sound_volume: 100,
          },
        },
        media,
      );
      expect(result.success).toBe(true);
      expect(result.details).not.toHaveProperty("audio_ignored_reason");
      const [url, payload] = axiosPost.mock.calls[0];
      expect(url).toEndWith("/business/photo/publish/");
      expect(payload.photo_images).toHaveLength(count);
      expect(payload.post_info.music_sound_info).toEqual({
        music_sound_id: "99999999999999999999",
      });
      expect(payload.post_info.auto_add_music).toBe(false);
      expect(payload).not.toHaveProperty("music_sound_info");
    },
  );

  test("allows photo music selection without volume", async () => {
    expect(
      (await publish({ music_sound_info: { music_sound_id: "123" } }, [photo]))
        .success,
    ).toBe(true);
    expect(axiosPost.mock.calls[0][1].post_info.music_sound_info).toEqual({
      music_sound_id: "123",
    });
  });

  test.each([undefined, false, true])(
    "preserves photo auto_add_music behavior without selection: %j",
    async (auto_add_music) => {
      expect((await publish({ auto_add_music }, [photo])).success).toBe(true);
      expect(axiosPost.mock.calls[0][1].post_info.auto_add_music).toBe(
        auto_add_music ?? true,
      );
      expect(axiosPost.mock.calls[0][1].post_info).not.toHaveProperty(
        "music_sound_info",
      );
    },
  );

  test.each([null, {}, { music_sound_id: 123 }, { music_sound_id: "" }])(
    "rejects malformed photo music ID: %j",
    async (audio) => {
      expect(
        (
          await publish(
            { music_sound_info: audio } as TiktokBusinessConfiguration,
            [photo],
          )
        ).success,
      ).toBe(false);
      expect(axiosPost).not.toHaveBeenCalled();
      expect(axiosGet).not.toHaveBeenCalled();
    },
  );

  test.each([
    null,
    {},
    { music_sound_id: 123, music_sound_volume: 50 },
    { music_sound_id: "123", music_sound_volume: -1 },
    { music_sound_id: "123", music_sound_volume: 50, music_sound_start: -1 },
    { music_sound_id: "123", music_sound_volume: 50, music_sound_end: 1.5 },
    {
      music_sound_id: "123",
      music_sound_volume: 50,
      music_sound_start: 1000,
      music_sound_end: 1000,
    },
  ])("rejects malformed selection %j", async (audio) => {
    const result = await publish({
      music_sound_info: audio,
    } as TiktokBusinessConfiguration);
    expect(result.success).toBe(false);
    expect(axiosPost).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  test("defaults video music volume to 50 when omitted", async () => {
    const audio = { music_sound_id: "88888888888888888888" };
    expect((await publish({ music_sound_info: audio })).success).toBe(true);
    expect(axiosPost.mock.calls[0][1].post_info.music_sound_info).toEqual({
      music_sound_id: audio.music_sound_id,
      music_sound_volume: 50,
    });
    expect(audio).not.toHaveProperty("music_sound_volume");
  });
});
