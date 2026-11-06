import { describe, expect, it, test } from "bun:test";
import * as twitterText from "twitter-text";
import type { ParseTweetOptions } from "twitter-text";
import { getAllowedCaption } from "./twitter-post-client";

const { parseTweet } = twitterText;

const STANDARD_LIMIT = 280;
const PREMIUM_LIMIT = 2200;

const mediaHarness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.SCENARIO;
const oauth2 = process.env.OAUTH2 === "true";
const events = [];
const metadata = mock(async (id, data) => { events.push("alt:" + id); expect(data).toEqual({ alt_text: { text: "alt" } }); });
const tweet = mock(async (payload) => {
  events.push("tweet");
  expect(payload).toEqual({ text: "caption", ...(scenario === "empty" ? {} : { media: { media_ids: scenario === "multi" ? ["media-1", "media-2", "media-3"] : ["media-1"] } }) });
  return { data: { id: "tweet-id" } };
});
mock.module("twitter-api-v2", () => ({
  TwitterApi: class {
    v1 = { createMediaMetadata: metadata };
    v2 = { tweet };
  },
}));
const childError = { message: "Twitter upload denied" };
const child = mock(async (id, payload) => {
  const index = child.mock.calls.length;
  events.push("upload:" + index);
  expect(id).toBe("upload-twitter-media");
  expect(payload).toEqual({ medium: { ...medium, ...(scenario === "multi" ? { url: "https://source.example/" + index } : {}) },
    auth: { appKey: "app", appSecret: "secret", accessToken: "token", refreshToken: "refresh", isOAuth2: oauth2 } });
  if (scenario === "throw") throw new Error("dispatch failed");
  return scenario === "failure" ? { ok: false, error: childError } : { ok: true, output: { success: true, mediaId: "media-" + index } };
});
const delay = mock(async (duration) => { events.push("delay"); expect(duration).toEqual({ seconds: 1 }); });
mock.module("@trigger.dev/sdk", () => ({ tasks: { triggerAndWait: child }, wait: { for: delay } }));
globalThis.fetch = mock(() => { throw new Error("Parent must not download media"); });
console.error = () => {};
const { TwitterPostClient } = await import("./twitter-post-client.ts");
const client = new TwitterPostClient({ app_id: "app", app_secret: "secret" });
const medium = { type: scenario === "video" ? "video" : "image", url: "https://source.example/image", skip_processing: true, alt_text: "alt" };
const multi = scenario === "multi";
const media = scenario === "empty" ? [] : multi ? [{ ...medium, url: "https://source.example/1" }, { type: "video" }, { ...medium, url: "https://source.example/2" }, { ...medium, url: "https://source.example/3" }, medium] : [medium];
const result = await client.post({ postId: "post", account: { id: "account", access_token: "token", refresh_token: "refresh", social_provider_metadata: { connection_type: oauth2 ? "oauth2" : "oauth1" } },
  caption: "caption", media, platformConfig: {} });
const failure = ["failure", "throw"].includes(scenario);
expect(result.success).toBe(!failure);
expect(child).toHaveBeenCalledTimes(scenario === "empty" ? 0 : multi ? 3 : 1);
expect(globalThis.fetch).not.toHaveBeenCalled();
if (failure) {
  expect(events).toEqual(["upload:1"]);
  expect(result.error_message).toBe("Failed to post to Twitter: " + (scenario === "failure" ? childError.message : "dispatch failed"));
  if (scenario === "failure") expect(result.details.error.cause).toBe(childError);
} else {
  expect(events).toEqual(scenario === "empty" ? ["delay", "tweet"] : multi
    ? ["upload:1", "alt:media-1", "upload:2", "alt:media-2", "upload:3", "alt:media-3", "delay", "tweet"]
    : ["upload:1", "alt:media-1", "delay", "tweet"]);
  expect(result.provider_post_id).toBe("tweet-id");
  const requests = result.details.requests.filter(entry => entry.uploadRequest);
  const responses = result.details.responses.filter(entry => entry.uploadResponse);
  expect(requests.length).toBe(child.mock.calls.length);
  expect(responses.map(entry => entry.uploadResponse.mediaId)).toEqual(multi ? ["media-1", "media-2", "media-3"] : scenario === "empty" ? [] : ["media-1"]);
}
`;

for (const oauth2 of [false, true]) {
  for (const scenario of ["success", "video", "empty", "multi", "failure", "throw"]) {
    test(`Twitter media child boundary: ${scenario}, OAuth2=${oauth2}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", mediaHarness], {
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
