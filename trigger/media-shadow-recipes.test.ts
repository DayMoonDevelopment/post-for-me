import { describe, expect, test } from "bun:test";
import { blueskyVideoOutput, genericVideoOutput, platformImageRecipe, type MediaInfo, type StoredMedia } from "./media-shadow-recipes";

function stored(media: MediaInfo, size = 1024): StoredMedia {
  return { fileId: "file", versionId: "version", path: "source", url: "https://files.example/source", contentType: "application/octet-stream", size, media };
}

function video(overrides: Partial<Extract<MediaInfo, { kind: "video" }>> = {}, size?: number): StoredMedia {
  return stored({
    kind: "video", container: "mov,mp4,m4a,3gp,3g2,mj2", durationSeconds: 60,
    bitrate: 8000000, width: 1920, height: 1080, rotation: 0, frameRate: 29.97,
    video: { codec: "h264", profile: "High", level: 40, pixelFormat: "yuv420p", bitrate: 7800000 },
    audio: { codec: "aac", bitrate: 128000, channels: 2, sampleRate: 48000 },
    ...overrides,
  }, size);
}

function image(width: number, height: number, orientation = 1, size?: number): StoredMedia {
  return stored({ kind: "image", format: "png", width, height, orientation, hasAlpha: true }, size);
}

describe("generic video policy", () => {
  test("uses display dimensions without rotating a portrait video twice", () => {
    expect(genericVideoOutput(video({ width: 1080, height: 1920, rotation: 90 }))?.video.scale).toEqual({ width: 1080, height: 1920 });
    const output = genericVideoOutput(video({ width: 2160, height: 3840, rotation: 270 }));
    expect(output?.video.scale).toEqual({ width: 1080, height: 1920 });
    expect(output?.video.fps).toBe(30);
  });

  test("rounds FPS like legacy and uses CRF for container conversion without upscaling", () => {
    const output = genericVideoOutput(video({ container: "matroska,webm", width: 641, height: 359, frameRate: 22.6 }));
    expect(output?.video).toMatchObject({ preset: "ultrafast", crf: 23, fps: 23, scale: { width: 640, height: 358 } });
    expect(output?.audio).toEqual({ codec: "aac", bitrate: 128000, channels: 2, sampleRate: 48000 });
    expect(genericVideoOutput(video({ frameRate: 60.5 }))?.video.fps).toBe(24);
  });

  test("unknown nullable metadata falls back to CRF, 24 fps and the standard audio", () => {
    expect(genericVideoOutput(video({ bitrate: null }))?.video.crf).toBe(23);
    expect(genericVideoOutput(video({ frameRate: null }))?.video.fps).toBe(24);
    for (const field of ["channels", "sampleRate", "bitrate"] as const) {
      const source = video();
      if (source.media.kind !== "video" || !source.media.audio) throw new Error("Invalid fixture");
      source.media.audio[field] = null;
      expect(genericVideoOutput(source)?.audio?.bitrate).toBe(128000);
    }
  });

  test("keeps a silent video silent", () => {
    expect(genericVideoOutput(video({ audio: null }))?.audio).toBeNull();
  });

  test("budgets the bitrate for high-bitrate and large sources, large first", () => {
    const high = genericVideoOutput(video({ bitrate: 25000001 }));
    expect(high?.video).toMatchObject({ bitrate: 24000000, maxrate: 25000000, bufsize: 50000000 });
    expect(high?.video.crf).toBeUndefined();
    const large = genericVideoOutput(video({ durationSeconds: 300, bitrate: 30000000 }, 300 * 1024 * 1024 + 1));
    const bitrate = Math.floor(280 * 1024 * 1024 * 8 / 300);
    expect(large?.video).toMatchObject({ preset: "superfast", bitrate, maxrate: Math.round(bitrate * 1.1), bufsize: bitrate * 2 });
    expect(large?.video.crf).toBeUndefined();
    expect(genericVideoOutput(video({}, 301 * 1024 * 1024))?.video.bitrate).toBe(15000000);
  });

  test("requires duration only when the size-targeted encode needs it", () => {
    expect(genericVideoOutput(video({ durationSeconds: null }))?.video.crf).toBe(23);
    expect(() => genericVideoOutput(video({ durationSeconds: null }, 301 * 1024 * 1024))).toThrow("positive duration");
    expect(() => genericVideoOutput(image(100, 100))).toThrow("video metadata");
  });
});

describe("Bluesky video policy", () => {
  test("matches all three legacy passes, including bitrate plus CRF on later passes", () => {
    for (const attempt of [1, 2, 3]) {
      const output = blueskyVideoOutput(video(), attempt, 120);
      const bitrate = Math.floor(100_000_000 * (0.9 - (attempt - 1) * 0.1) * 8 / 120);
      expect(output.video).toEqual({
        codec: "h264", preset: (["fast", "medium", "slow"] as const)[attempt - 1],
        profile: attempt === 1 ? "high" : "main", level: "4.0", pixelFormat: "yuv420p",
        bitrate, maxrate: Math.round(bitrate * 1.2), bufsize: bitrate * 2,
        ...(attempt > 1 ? { crf: attempt === 2 ? 28 : 32 } : {}),
      });
      expect(output.audio?.bitrate).toBe([128000, 96000, 64000][attempt - 1]);
    }
  });

  test("uses supplied original duration, retains silence and floors bitrate", () => {
    const output = blueskyVideoOutput(video({ audio: null, durationSeconds: null }), 3, 10000);
    expect(output.audio).toBeNull();
    expect(output.video.bitrate).toBe(500000);
    expect(output.video.scale).toBeUndefined();
    expect(output.video.fps).toBeUndefined();
  });

  test("rejects invalid attempts and unusable durations", () => {
    for (const attempt of [0, 4, 1.5]) expect(() => blueskyVideoOutput(video(), attempt, 60)).toThrow();
    for (const duration of [0, -1, NaN, Infinity]) expect(() => blueskyVideoOutput(video(), 1, duration)).toThrow();
  });
});

describe("platform image policy", () => {
  test("Instagram uses feed, story and default reel floors", () => {
    const source = image(900, 2000);
    expect(platformImageRecipe("instagram", source, { isFeed: true })?.output.resize).toMatchObject({ width: 900, height: 1200 });
    for (const options of [{}, { placement: "stories", isFeed: true }]) {
      expect(platformImageRecipe("instagram", source, options)?.output.resize).toMatchObject({ width: 900, height: 1600 });
    }
    const recipe = platformImageRecipe("instagram", image(3000, 1000), { isFeed: true });
    expect(recipe?.output.resize).toEqual({ width: 1910, height: 1000, fit: "cover", withoutEnlargement: false });
    expect(recipe?.output.quality).toBe(100);
    expect(recipe?.initialQuality).toBe(100);
    expect(recipe?.maxBytes).toBe(8 * 1024 * 1024);
  });

  test("Instagram reconstructs raw dimensions for every EXIF quarter-turn orientation", () => {
    for (const orientation of [5, 6, 7, 8]) {
      const recipe = platformImageRecipe("instagram", image(1200, 1600, orientation), { isFeed: true });
      expect(recipe?.output.resize).toMatchObject({ width: 1600, height: 1200 });
      expect(recipe?.output.autoOrient).toBe(true);
    }
  });

  test("Instagram first-image geometry overrides only when raw aspect ratios differ", () => {
    expect(platformImageRecipe("instagram", image(400, 300), { firstImage: { width: 800, height: 600 } })?.output.resize).toMatchObject({ width: 400, height: 300 });
    expect(platformImageRecipe("instagram", image(400, 300), { firstImage: { width: 1080, height: 1080 } })?.output.resize).toMatchObject({ width: 1080, height: 1080 });
  });

  test("both TikTok clients select the nearest displayed ratio, not raw EXIF dimensions", () => {
    for (const platform of ["tiktok", "tiktok_business"]) {
      for (const [width, height, targetWidth, targetHeight] of [
        [600, 1000, 1080, 1920], [800, 1000, 1080, 1440], [1000, 1000, 1080, 1080], [2000, 1000, 1920, 1080],
      ]) {
        const recipe = platformImageRecipe(platform, image(width, height, 6), {});
        expect(recipe?.output.resize).toEqual({ width: targetWidth, height: targetHeight, fit: "cover", withoutEnlargement: false });
        expect(recipe?.output).toMatchObject({ format: "jpeg", quality: 100, autoOrient: true });
        expect(recipe?.maxBytes).toBe(20 * 1024 * 1024);
      }
    }
  });

  test("X compresses only above 5 MiB without auto-orienting or resizing", () => {
    for (const platform of ["twitter", "x"]) {
      expect(platformImageRecipe(platform, image(4000, 3000, 6, 5 * 1024 * 1024), {})).toBeUndefined();
      expect(platformImageRecipe(platform, image(4000, 3000, 6, 5 * 1024 * 1024 + 1), {})).toEqual({
        output: { type: "image", format: "jpeg", quality: 80, autoOrient: false, background: "#000000" },
        maxBytes: 5 * 1024 * 1024, initialQuality: 80,
      });
    }
  });

  test("Bluesky uses its fractional-byte threshold then a 2000px inside resize", () => {
    const limit = 976.56 * 1024;
    expect(platformImageRecipe("bluesky", image(3000, 4000, 1, Math.floor(limit)), {})).toBeUndefined();
    expect(platformImageRecipe("bluesky", image(3000, 4000, 1, Math.ceil(limit)), {})).toEqual({
      output: { type: "image", format: "jpeg", quality: 80, autoOrient: true, background: "#000000",
        resize: { width: 2000, height: 2000, fit: "inside", withoutEnlargement: true } },
      maxBytes: Math.floor(limit), initialQuality: 80,
    });
  });

  test("unsupported platforms and non-image metadata have no image recipe", () => {
    expect(platformImageRecipe("facebook", image(100, 100), {})).toBeUndefined();
    expect(platformImageRecipe("instagram", video(), {})).toBeUndefined();
    expect(platformImageRecipe("tiktok", stored({ kind: "document", contentType: "application/pdf" }), {})).toBeUndefined();
  });
});
