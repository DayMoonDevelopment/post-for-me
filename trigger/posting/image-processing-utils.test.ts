import { describe, expect, test } from "bun:test";
import {
  computeCropDimensions,
  resolveInstagramMinAspectRatio,
  shouldSkipProcessing,
} from "./image-processing-utils";

describe("shouldSkipProcessing", () => {
  test("true when skip_processing is true", () => {
    expect(shouldSkipProcessing({ skip_processing: true })).toBe(true);
  });

  test("false when skip_processing is false", () => {
    expect(shouldSkipProcessing({ skip_processing: false })).toBe(false);
  });

  test("false when skip_processing is null", () => {
    expect(shouldSkipProcessing({ skip_processing: null })).toBe(false);
  });

  test("false when skip_processing is omitted", () => {
    expect(shouldSkipProcessing({})).toBe(false);
  });
});

describe("computeCropDimensions", () => {
  const minAspectRatio = 3 / 4; // 0.75, the fixed Instagram feed floor
  const maxAspectRatio = 1.91;

  test("PFM-1121 regression: a 1080x1440 (3:4) image is no longer cropped", () => {
    const result = computeCropDimensions({
      width: 1080,
      height: 1440,
      minAspectRatio,
      maxAspectRatio,
    });

    expect(result).toEqual({ width: 1080, height: 1440 });
  });

  test("the same 1080x1440 image WOULD have been cropped under the old 4:5 floor", () => {
    // Documents the bug this fix resolves: with the stale 0.8 floor, the
    // exact case from the ticket was cropped to 1080x1350.
    const result = computeCropDimensions({
      width: 1080,
      height: 1440,
      minAspectRatio: 4 / 5,
      maxAspectRatio,
    });

    expect(result).toEqual({ width: 1080, height: 1350 });
  });

  test("an image taller than 3:4 is still cropped to the min ratio", () => {
    // 1080x2160 is a 1:2 (0.5) image, well under the 0.75 floor.
    const result = computeCropDimensions({
      width: 1080,
      height: 2160,
      minAspectRatio,
      maxAspectRatio,
    });

    expect(result).toEqual({ width: 1080, height: 1440 });
  });

  test("an image wider than the max ratio is cropped in width", () => {
    // 2160x1080 is 2:1 (2.0), over the 1.91 ceiling.
    const result = computeCropDimensions({
      width: 2160,
      height: 1080,
      minAspectRatio,
      maxAspectRatio,
    });

    expect(result).toEqual({ width: 2063, height: 1080 });
  });

  test("a square image within bounds is left untouched", () => {
    const result = computeCropDimensions({
      width: 1080,
      height: 1080,
      minAspectRatio,
      maxAspectRatio,
    });

    expect(result).toEqual({ width: 1080, height: 1080 });
  });

  test("exactly at the min ratio boundary is not cropped", () => {
    const result = computeCropDimensions({
      width: 1080,
      height: 1440, // ratio === minAspectRatio exactly
      minAspectRatio,
      maxAspectRatio,
    });

    expect(result).toEqual({ width: 1080, height: 1440 });
  });
});

describe("resolveInstagramMinAspectRatio", () => {
  const feedMinAspectRatio = 3 / 4;
  const storiesMinAspectRatio = 9 / 16;
  const reelsMinAspectRatio = 9 / 16;

  test("stories placement always uses the stories floor", () => {
    expect(
      resolveInstagramMinAspectRatio({
        placement: "stories",
        isFeed: true,
        feedMinAspectRatio,
        storiesMinAspectRatio,
        reelsMinAspectRatio,
      }),
    ).toBe(storiesMinAspectRatio);
  });

  test("is_feed: true resolves to the feed floor (now 3:4)", () => {
    expect(
      resolveInstagramMinAspectRatio({
        isFeed: true,
        feedMinAspectRatio,
        storiesMinAspectRatio,
        reelsMinAspectRatio,
      }),
    ).toBe(3 / 4);
  });

  test("is_feed: false resolves to the reels floor", () => {
    expect(
      resolveInstagramMinAspectRatio({
        isFeed: false,
        feedMinAspectRatio,
        storiesMinAspectRatio,
        reelsMinAspectRatio,
      }),
    ).toBe(reelsMinAspectRatio);
  });

  test("PFM-1121 carousel bug: an unset is_feed falls through to the reels floor, not the feed floor", () => {
    // Documents the pre-fix carousel bug (options.is_feed was never passed
    // for the first carousel image, so it silently got the looser reels
    // ratio). #processCarousel now always passes is_feed: true explicitly.
    expect(
      resolveInstagramMinAspectRatio({
        feedMinAspectRatio,
        storiesMinAspectRatio,
        reelsMinAspectRatio,
      }),
    ).toBe(reelsMinAspectRatio);
  });
});
