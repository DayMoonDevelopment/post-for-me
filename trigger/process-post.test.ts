import { beforeAll, describe, expect, test } from "bun:test";

// process-post.ts constructs a Supabase client and an Unkey client at module
// scope, so these need to resolve to something construction-time-valid
// before the module can be imported (no network calls happen at import).
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-dummy";
process.env.UNKEY_ROOT_KEY = "unkey_dummy";

let mod: typeof import("./process-post");

beforeAll(async () => {
  mod = await import("./process-post");
});

// Regression coverage for PFM-1141 / PFM-1129 / PFM-1131 (part 2 of 2):
// media order scrambled on publish. Part 1 was `process-post.ts` splitting
// localized media into images-then-videos and concatenating, which silently
// discarded the originally submitted interleaving for any mixed image+video
// post — fixed by threading a `position` through localization/video
// processing and reassembling by sorting on it instead of by type-bucket
// concatenation order (tested below).
//
// Part 2 (PFM-1087) was that `position` itself being seeded from unordered
// array read order rather than a persisted column, so even an all-image or
// all-video carousel could still rotate between reads. That's now backed by
// the `social_post_media.index` column (every embedded read of the table
// orders by it), and `position` in `process-post.ts` is seeded from
// `medium.index` instead of array position — not separately unit-tested
// here since it's a one-line callsite, not branching logic.

const medium = (
  overrides: Partial<import("./process-post").ProcessedMedium> = {},
): import("./process-post").ProcessedMedium => ({
  id: "spm_1",
  url: "https://example.com/media.jpg",
  thumbnail_url: "",
  type: "image",
  position: 0,
  ...overrides,
});

describe("splitLocalizedMediaForProcessing", () => {
  test("images and skip-processing videos are ready immediately; other videos are queued", () => {
    const media = [
      medium({ id: "img", type: "image", position: 0 }),
      medium({ id: "vid_skip", type: "video", position: 1, skip_processing: true }),
      medium({ id: "vid_process", type: "video", position: 2, skip_processing: false }),
    ];

    const { readyMedia, videosToProcess } =
      mod.splitLocalizedMediaForProcessing(media);

    expect(readyMedia.map((m) => m.id)).toEqual(["img", "vid_skip"]);
    expect(videosToProcess.map((m) => m.id)).toEqual(["vid_process"]);
  });

  test("a video with skip_processing left undefined is treated as needing processing", () => {
    const media = [medium({ id: "vid", type: "video" })];

    const { readyMedia, videosToProcess } =
      mod.splitLocalizedMediaForProcessing(media);

    expect(readyMedia).toEqual([]);
    expect(videosToProcess.map((m) => m.id)).toEqual(["vid"]);
  });
});

describe("orderProcessedMedia", () => {
  test("restores original submitted order for a mixed image+video carousel", () => {
    // Submitted order: image, video, image, video (positions 0-3).
    // Images resolve into readyMedia immediately; videos are processed
    // separately and come back in their own batch order.
    const readyMedia = [
      medium({ id: "img_0", position: 0, type: "image" }),
      medium({ id: "img_2", position: 2, type: "image" }),
    ];
    const processedVideos = [
      medium({ id: "vid_3", position: 3, type: "video" }),
      medium({ id: "vid_1", position: 1, type: "video" }),
    ];

    const result = mod.orderProcessedMedia(readyMedia, processedVideos);

    expect(result.map((m) => m.id)).toEqual([
      "img_0",
      "vid_1",
      "img_2",
      "vid_3",
    ]);
  });

  test("an all-image carousel keeps its submitted order even if array order is scrambled", () => {
    // Guards against the "clean rotation" symptom reported in PFM-1129:
    // whatever order the inputs arrive in, position is the only thing that
    // determines final order.
    const readyMedia = [
      medium({ id: "img_3", position: 3 }),
      medium({ id: "img_0", position: 0 }),
      medium({ id: "img_1", position: 1 }),
      medium({ id: "img_2", position: 2 }),
    ];

    const result = mod.orderProcessedMedia(readyMedia, []);

    expect(result.map((m) => m.id)).toEqual([
      "img_0",
      "img_1",
      "img_2",
      "img_3",
    ]);
  });

  test("does not mutate the input arrays", () => {
    const readyMedia = [medium({ id: "b", position: 1 }), medium({ id: "a", position: 0 })];
    const readyMediaCopy = [...readyMedia];

    mod.orderProcessedMedia(readyMedia, []);

    expect(readyMedia).toEqual(readyMediaCopy);
  });
});
