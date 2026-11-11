import type { MediaServerImageOutput, MediaServerVideoAccept, MediaServerVideoOutput } from "./media-server";
import { computeCropDimensions, resolveInstagramMinAspectRatio } from "./posting/image-processing-utils";

// Production recipes vendored from Zenith's jobs catalogue. Dimensions are display-oriented.
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

const GENERIC_ASPECT_TOLERANCE = 0.1;
const GENERIC_BOUNDS = [
  { ratio: 9 / 16, width: 1080, height: 1920 },
  { ratio: 16 / 9, width: 1920, height: 1080 },
  { ratio: 1, width: 1080, height: 1080 },
  { ratio: 4 / 3, width: 1440, height: 1080 },
];
const GENERIC_FALLBACK_BOUND = { width: 1920, height: 1080 };
const GENERIC_MAX_BITRATE = 25000000;
const GENERIC_AUDIO_BITRATE = { min: 126000, max: 130000 };

/** The largest result, in bytes, that the generic recipe lets media store. */
export const GENERIC_VIDEO_MAX_BYTES = 300 * 1024 * 1024;

/** What production accepts as-is: media keeps a source that passes, and re-encodes or copies the rest. */
export const GENERIC_VIDEO_ACCEPT: MediaServerVideoAccept = {
  containers: ["mp4"],
  videoCodecs: ["h264", "hevc", "h265"],
  maxBitrate: GENERIC_MAX_BITRATE,
  fps: { min: 22.5, max: 60.4999 },
  bounds: [
    ...GENERIC_BOUNDS.map((bound) => ({
      aspectRatio: { min: bound.ratio - GENERIC_ASPECT_TOLERANCE, max: bound.ratio + GENERIC_ASPECT_TOLERANCE },
      maxWidth: bound.width,
      maxHeight: bound.height,
    })),
    { maxWidth: GENERIC_FALLBACK_BOUND.width, maxHeight: GENERIC_FALLBACK_BOUND.height },
  ],
  audioCodecs: ["aac"],
  audioChannels: { min: 1, max: 2 },
  audioSampleRate: { min: 1, max: 48000 },
  audioBitrate: GENERIC_AUDIO_BITRATE,
};

/**
 * The encode production makes when a video fails `GENERIC_VIDEO_ACCEPT`.
 * @param source The localized video.
 * @returns The H.264 output, sized to the source's aspect-ratio bound.
 */
export function genericVideoOutput(source: StoredMedia): MediaServerVideoOutput {
  const media = source.media;
  if (media.kind !== "video") throw new Error("Expected video metadata");
  const { width, height, audio } = media;
  const aspectRatio = width / height;
  const bounds = GENERIC_BOUNDS.find((bound) => Math.abs(aspectRatio - bound.ratio) <= GENERIC_ASPECT_TOLERANCE)
    ?? GENERIC_FALLBACK_BOUND;
  const frameRate = media.frameRate === null ? null : Math.round(media.frameRate);
  const validFrameRate = frameRate !== null && frameRate >= 23 && frameRate <= 60;
  const large = source.size > GENERIC_VIDEO_MAX_BYTES;
  const highBitrate = media.bitrate !== null && media.bitrate > GENERIC_MAX_BITRATE;

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
