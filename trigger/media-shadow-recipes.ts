import type { MediaServerImageOutput, MediaServerVideoOutput } from "./media-server";
import { computeCropDimensions, resolveInstagramMinAspectRatio } from "./posting/image-processing-utils";

// Vendored from Zenith's jobs catalogue. Dimensions are already display-oriented.
export type MediaInfo =
  | {
      kind: "video";
      container: string;
      durationSeconds: number | null;
      bitrate: number | null;
      width: number;
      height: number;
      rotation: 0 | 90 | 180 | 270;
      frameRate: number | null;
      video: {
        codec: string;
        profile: string | null;
        level: number | null;
        pixelFormat: string | null;
        bitrate: number | null;
      };
      audio: { codec: string; bitrate: number | null; channels: number | null; sampleRate: number | null } | null;
    }
  | { kind: "image"; format: string; width: number; height: number; orientation: number; hasAlpha: boolean }
  | { kind: "document"; contentType: string };

export type StoredMedia = {
  fileId: string;
  versionId: string;
  path: string;
  url: string;
  contentType: string;
  size: number;
  media: MediaInfo;
};

export function genericVideoOutput(source: StoredMedia): MediaServerVideoOutput | undefined {
  const media = source.media;
  if (media.kind !== "video") throw new Error("Expected video metadata");
  const { width, height, audio } = media;
  const aspectRatio = width / height;
  const bounds = [
    { ratio: 9 / 16, width: 1080, height: 1920 },
    { ratio: 16 / 9, width: 1920, height: 1080 },
    { ratio: 1, width: 1080, height: 1080 },
    { ratio: 4 / 3, width: 1440, height: 1080 },
  ].find((bound) => Math.abs(aspectRatio - bound.ratio) <= 0.1)
    ?? { width: 1920, height: 1080 };
  const frameRate = media.frameRate === null ? null : Math.round(media.frameRate);
  const validFrameRate = frameRate !== null && frameRate >= 23 && frameRate <= 60;
  const validAudio = audio === null || (
    audio.codec === "aac" && audio.channels !== null && audio.channels > 0 && audio.channels <= 2 &&
    audio.sampleRate !== null && audio.sampleRate > 0 && audio.sampleRate <= 48000 &&
    audio.bitrate !== null && audio.bitrate >= 126000 && audio.bitrate <= 130000
  );
  const large = source.size > 300 * 1024 * 1024;
  const highBitrate = media.bitrate !== null && media.bitrate > 25000000;
  if (
    media.container.includes("mp4") && ["h264", "hevc", "h265"].includes(media.video.codec) &&
    media.bitrate !== null && !highBitrate && !large && validFrameRate &&
    width <= bounds.width && height <= bounds.height && validAudio
  ) return undefined;

  const scaleRatio = Math.min(bounds.width / width, bounds.height / height, 1);
  const even = (dimension: number) => Math.max(2, Math.floor(dimension / 2) * 2);
  const output: MediaServerVideoOutput = {
    type: "video",
    container: "mp4",
    faststart: true,
    video: {
      codec: "h264",
      preset: large ? "superfast" : "ultrafast",
      profile: "high",
      level: "4.0",
      pixelFormat: "yuv420p",
      crf: 23,
      maxrate: 25000000,
      bufsize: 50000000,
      fps: validFrameRate ? frameRate! : 24,
      scale: {
        width: even(scaleRatio < 1 ? Math.round(width * scaleRatio / 2) * 2 : width),
        height: even(scaleRatio < 1 ? Math.round(height * scaleRatio / 2) * 2 : height),
      },
    },
    audio: audio === null ? null : { codec: "aac", bitrate: 128000, channels: 2, sampleRate: 48000 },
  };
  if (large) {
    const duration = media.durationSeconds;
    if (duration === null || !Number.isFinite(duration) || duration <= 0) {
      throw new Error("Large video compression requires a positive duration");
    }
    const bitrate = Math.min(Math.floor(280 * 1024 * 1024 * 8 / duration), 15000000);
    delete output.video.crf;
    output.video.bitrate = bitrate;
    output.video.maxrate = Math.round(bitrate * 1.1);
    output.video.bufsize = bitrate * 2;
  } else if (highBitrate) {
    delete output.video.crf;
    output.video.bitrate = 24000000;
  }
  return output;
}

export function blueskyVideoOutput(source: StoredMedia, attempt: number, durationSeconds: number): MediaServerVideoOutput {
  if (source.media.kind !== "video") throw new Error("Expected video metadata");
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 3) throw new Error("Expected Bluesky attempt 1, 2 or 3");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("Expected a positive video duration");
  const bitrate = Math.max(Math.floor(100_000_000 * (0.9 - (attempt - 1) * 0.1) * 8 / durationSeconds), 500000);
  return {
    type: "video",
    container: "mp4",
    faststart: true,
    video: {
      codec: "h264",
      preset: attempt === 1 ? "fast" : attempt === 2 ? "medium" : "slow",
      profile: attempt === 1 ? "high" : "main",
      level: "4.0",
      pixelFormat: "yuv420p",
      bitrate,
      maxrate: Math.round(bitrate * 1.2),
      bufsize: bitrate * 2,
      ...(attempt > 1 ? { crf: attempt === 2 ? 28 : 32 } : {}),
    },
    audio: source.media.audio === null ? null : {
      codec: "aac", bitrate: attempt === 1 ? 128000 : attempt === 2 ? 96000 : 64000, channels: 2, sampleRate: 48000,
    },
  };
}

export function platformImageRecipe(
  platform: string,
  source: StoredMedia,
  options: { placement?: string; isFeed?: boolean; firstImage?: { width: number; height: number } },
): { output: MediaServerImageOutput; maxBytes: number; initialQuality: number } | undefined {
  const media = source.media;
  if (media.kind !== "image") return undefined;
  let maxBytes: number;
  let initialQuality = 100;
  let resize: MediaServerImageOutput["resize"];
  let autoOrient = true;
  if (platform === "instagram") {
    // Instagram chooses its crop before Sharp auto-orients, using stored dimensions.
    const rotated = media.orientation >= 5 && media.orientation <= 8;
    const width = rotated ? media.height : media.width;
    const height = rotated ? media.width : media.height;
    const first = options.firstImage;
    const target = first?.width && first.height
      ? (first.width / first.height !== width / height ? first : { width, height })
      : computeCropDimensions({
          width, height,
          minAspectRatio: resolveInstagramMinAspectRatio({
            placement: options.placement, isFeed: options.isFeed,
            feedMinAspectRatio: 3 / 4, storiesMinAspectRatio: 9 / 16, reelsMinAspectRatio: 9 / 16,
          }),
          maxAspectRatio: 1.91,
        });
    resize = { width: target.width, height: target.height, fit: "cover", withoutEnlargement: false };
    maxBytes = 8 * 1024 * 1024;
  } else if (platform === "tiktok" || platform === "tiktok_business") {
    const ratio = media.width / media.height;
    const target = [
      { ratio: 9 / 16, width: 1080, height: 1920 },
      { ratio: 3 / 4, width: 1080, height: 1440 },
      { ratio: 1, width: 1080, height: 1080 },
      { ratio: 16 / 9, width: 1920, height: 1080 },
    ].reduce((closest, current) => Math.abs(current.ratio - ratio) < Math.abs(closest.ratio - ratio) ? current : closest);
    resize = { width: target.width, height: target.height, fit: "cover", withoutEnlargement: false };
    maxBytes = 20 * 1024 * 1024;
  } else if (platform === "twitter" || platform === "x") {
    maxBytes = 5 * 1024 * 1024;
    if (source.size <= maxBytes) return undefined;
    initialQuality = 80;
    autoOrient = false;
  } else if (platform === "bluesky") {
    if (source.size <= 976.56 * 1024) return undefined;
    maxBytes = Math.floor(976.56 * 1024);
    initialQuality = 80;
    resize = { width: 2000, height: 2000, fit: "inside", withoutEnlargement: true };
  } else return undefined;
  return {
    output: { type: "image", format: "jpeg", quality: initialQuality, autoOrient, background: "#000000", ...(resize ? { resize } : {}) },
    maxBytes,
    initialQuality,
  };
}
