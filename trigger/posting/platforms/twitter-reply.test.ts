import { expect, test } from "bun:test";

// Isolate module mocks so they cannot affect other platform client tests.
const replyHarness = String.raw`
import { expect, mock } from "bun:test";
const oauth2 = process.env.OAUTH2 === "true";
const withReply = process.env.WITH_REPLY === "true";
const withMedia = process.env.WITH_MEDIA === "true";
const target = "1841234567890123456";
const expectedPayload = {
  text: "Thanks for the update!",
  reply_settings: "following",
  ...(withMedia ? { media: { media_ids: ["media-id"] } } : {}),
  ...(withReply ? { reply: { in_reply_to_tweet_id: target } } : {}),
};
const tweet = mock(async (payload) => {
  expect(payload).toEqual(expectedPayload);
  return { data: { id: "reply-id" } };
});
mock.module("twitter-api-v2", () => ({
  TwitterApi: class { v2 = { tweet }; },
}));
mock.module("@trigger.dev/sdk", () => ({
  tasks: { triggerAndWait: mock(async () => ({ ok: true, output: { success: true, mediaId: "media-id" } })) },
  wait: { for: mock(async () => {}) },
}));
const { TwitterPostClient } = await import("./twitter-post-client.ts");
const client = new TwitterPostClient({ app_id: "app", app_secret: "secret" });
const result = await client.post({
  postId: "post",
  account: { id: "account", access_token: "token", refresh_token: "refresh",
    social_provider_metadata: { connection_type: oauth2 ? "oauth2" : "oauth1" } },
  caption: "Thanks for the update!",
  media: withMedia ? [{ type: "image", url: "https://example.com/image.png" }] : [],
  platformConfig: { reply_settings: "following", ...(withReply ? { reply_to_tweet_id: target } : {}) },
});
expect(result.success).toBe(true);
expect(result.provider_post_id).toBe("reply-id");
expect(tweet).toHaveBeenCalledTimes(1);
expect(result.details.requests.find(entry => entry.postRequest).postRequest).toEqual(expectedPayload);
`;

for (const oauth2 of [false, true]) {
  for (const withReply of [false, true]) {
    for (const withMedia of [false, true]) {
      test(`X reply mapping: reply=${withReply}, media=${withMedia}, OAuth2=${oauth2}`, async () => {
        const child = Bun.spawn([process.execPath, "--eval", replyHarness], {
          cwd: __dirname,
          env: {
            ...process.env,
            OAUTH2: String(oauth2),
            WITH_REPLY: String(withReply),
            WITH_MEDIA: String(withMedia),
          },
          stdout: "pipe",
          stderr: "pipe",
        });
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ]);
        expect({ exitCode, stdout, stderr }).toEqual({
          exitCode: 0,
          stdout: "",
          stderr: "",
        });
      });
    }
  }
}
