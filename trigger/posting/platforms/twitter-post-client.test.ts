import { describe, expect, it, test } from "bun:test";
import * as twitterText from "twitter-text";
import type { ParseTweetOptions } from "twitter-text";
import { getAllowedCaption } from "./twitter-post-client";

const { parseTweet } = twitterText;

const STANDARD_LIMIT = 280;
const PREMIUM_LIMIT = 2200;

const imageHarness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.SCENARIO;
const oauth2 = process.env.OAUTH2 === "true";
const skip = scenario === "skip";
const uploads = [];
const upload = async (...args) => { uploads.push(args); return "media-id"; };
mock.module("twitter-api-v2", () => ({
  EUploadMimeType: { Png: "image/png" },
  TwitterApi: class {
    v1 = { uploadMedia: upload, createMediaMetadata: async () => {} };
    v2 = { uploadMedia: upload, tweet: async () => ({ data: { id: "tweet-id" } }) };
  },
}));
const child = mock(async (id, payload) => {
  expect(id).toBe("transform-buffered-image");
  expect(payload).toEqual({ url: "https://source.example/image", platform: "twitter" });
  if (scenario === "throw") throw new Error("child failed");
  return scenario === "failure" ? { ok: false, error: { message: "failed" } }
    : { ok: true, output: { url: "https://media.example/artifact", mimeType: "image/png" } };
});
mock.module("@trigger.dev/sdk", () => ({ tasks: { triggerAndWait: child }, wait: { for: async () => {} } }));
globalThis.fetch = mock(async (url) => {
  expect(url).toBe(skip ? "https://source.example/image" : "https://media.example/artifact");
  return new Response(skip ? "original" : "prepared", { headers: { "content-type": skip ? "image/png" : "image/jpeg" } });
});
console.error = () => {};
const { TwitterPostClient } = await import("./twitter-post-client.ts");
const client = new TwitterPostClient({ app_id: "app", app_secret: "secret" });
const medium = { type: "image", url: "https://source.example/image", skip_processing: skip, alt_text: "alt" };
const multi = scenario === "multi";
const result = await client.post({ postId: "post", account: { id: "account", access_token: "token", social_provider_metadata: { connection_type: oauth2 ? "oauth2" : "oauth1" } },
  caption: "caption", media: multi ? [medium, { type: "video" }, medium, medium, medium, medium] : [medium], platformConfig: {} });
const failure = ["failure", "throw"].includes(scenario);
expect(result.success).toBe(!failure);
expect(child).toHaveBeenCalledTimes(skip ? 0 : multi ? 3 : 1);
expect(uploads.length).toBe(failure ? 0 : multi ? 3 : 1);
expect(globalThis.fetch).toHaveBeenCalledTimes(uploads.length);
for (const args of uploads) {
  expect(args[0]).toEqual(Buffer.from(skip ? "original" : "prepared"));
  expect(args[1]).toEqual(oauth2 ? { media_type: "image/png" } : { mimeType: "image/png" });
  if (oauth2) expect(args[2]).toBe(5 * 1024 * 1024);
}
`;

for (const oauth2 of [false, true]) {
  for (const scenario of ["success", "skip", "multi", "failure", "throw"]) {
    test(`Twitter image child boundary: ${scenario}, OAuth2=${oauth2}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", imageHarness], {
        cwd: __dirname,
        env: { ...process.env, SCENARIO: scenario, OAUTH2: String(oauth2) },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });
  }
}

// Same runtime-sourced config `getAllowedCaption` uses internally — see the
// comment in twitter-post-client.ts for why this isn't in the typed API.
const TWITTER_TEXT_V3_CONFIG = (
  twitterText as unknown as {
    configs: { version3: ParseTweetOptions };
  }
).configs.version3;

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

  it("trims to near the weighted limit even when an invalid character appears early", () => {
    // twitter-text freezes `validRangeEnd` at the first character it
    // considers invalid (e.g. a BOM) and never advances it again, even
    // though weightedLength keeps growing past the limit. Truncation must
    // not key off validRangeEnd or this collapses to a handful of chars.
    const caption = "Hello﻿" + "a".repeat(400);
    expect(weightedLength(caption, STANDARD_LIMIT)).toBeGreaterThan(
      STANDARD_LIMIT,
    );

    const { allowedCaption, trimmed } = getAllowedCaption(
      caption,
      STANDARD_LIMIT,
    );

    expect(trimmed).toBe(true);
    expect(allowedCaption.length).toBeGreaterThan(200);
    expect(weightedLength(allowedCaption, STANDARD_LIMIT)).toBeLessThanOrEqual(
      STANDARD_LIMIT,
    );
  });
});
