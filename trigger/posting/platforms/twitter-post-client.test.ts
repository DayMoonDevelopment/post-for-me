import { describe, expect, it } from "bun:test";
import { parseTweet } from "twitter-text";
import { getAllowedCaption } from "./twitter-post-client";

const STANDARD_LIMIT = 280;
const PREMIUM_LIMIT = 2200;

// Mirrors the v3 config `getAllowedCaption` uses internally — see the
// comment in twitter-post-client.ts for why this can't be imported from
// twitter-text directly.
const TWITTER_TEXT_V3_CONFIG = {
  version: 3,
  scale: 100,
  defaultWeight: 200,
  emojiParsingEnabled: true,
  transformedURLLength: 23,
  ranges: [
    { start: 0, end: 4351, weight: 100 },
    { start: 8192, end: 8205, weight: 100 },
    { start: 8208, end: 8223, weight: 100 },
    { start: 8242, end: 8247, weight: 100 },
  ],
};

function weightedLength(text: string, limit: number): number {
  return parseTweet(text, {
    ...TWITTER_TEXT_V3_CONFIG,
    maxWeightedTweetLength: limit,
  }).weightedLength;
}

describe("getAllowedCaption", () => {
  it("does not trim an all-CJK caption exactly at the weighted limit", () => {
    // Each CJK char is weighted 2, so 140 chars = 280 weighted.
    const caption = "あ".repeat(140);
    expect(weightedLength(caption, STANDARD_LIMIT)).toBe(280);

    const { allowedCaption, trimmed } = getAllowedCaption(
      caption,
      STANDARD_LIMIT,
    );

    expect(trimmed).toBe(false);
    expect(allowedCaption).toBe(caption);
  });

  it("trims an all-CJK caption one character past the weighted limit", () => {
    // 141 chars = 282 weighted, over the 280 limit.
    const caption = "あ".repeat(141);
    expect(weightedLength(caption, STANDARD_LIMIT)).toBe(282);

    const { allowedCaption, trimmed } = getAllowedCaption(
      caption,
      STANDARD_LIMIT,
    );

    expect(trimmed).toBe(true);
    expect(allowedCaption.length).toBeLessThan(caption.length);
    expect(weightedLength(allowedCaption, STANDARD_LIMIT)).toBeLessThanOrEqual(
      STANDARD_LIMIT,
    );
  });

  it("trims an emoji/newline-heavy caption cleanly, without splitting surrogate pairs", () => {
    const emoji = "😀"; // surrogate pair, weighted 2
    const caption = (emoji + "\n").repeat(100); // well over the weighted limit

    const { allowedCaption, trimmed } = getAllowedCaption(
      caption,
      STANDARD_LIMIT,
    );

    expect(trimmed).toBe(true);
    expect(weightedLength(allowedCaption, STANDARD_LIMIT)).toBeLessThanOrEqual(
      STANDARD_LIMIT,
    );

    // A cleanly-truncated string re-parses without lone surrogate issues:
    // spreading by code point should round-trip to the same string.
    expect([...allowedCaption].join("")).toBe(allowedCaption);
  });

  it("does not trim a plain ASCII caption well under the limit", () => {
    const caption = "Just a normal, short tweet about nothing in particular.";

    const { allowedCaption, trimmed } = getAllowedCaption(
      caption,
      STANDARD_LIMIT,
    );

    expect(trimmed).toBe(false);
    expect(allowedCaption).toBe(caption);
  });

  it("honors the premium limit instead of the standard limit", () => {
    // 200 CJK chars = 400 weighted: over standard (280), under premium (2200).
    const caption = "あ".repeat(200);
    expect(weightedLength(caption, PREMIUM_LIMIT)).toBe(400);

    const standardResult = getAllowedCaption(caption, STANDARD_LIMIT);
    expect(standardResult.trimmed).toBe(true);

    const premiumResult = getAllowedCaption(caption, PREMIUM_LIMIT);
    expect(premiumResult.trimmed).toBe(false);
    expect(premiumResult.allowedCaption).toBe(caption);
  });

  it("leaves an empty caption untouched", () => {
    const { allowedCaption, trimmed } = getAllowedCaption("", STANDARD_LIMIT);

    expect(trimmed).toBe(false);
    expect(allowedCaption).toBe("");
  });
});
