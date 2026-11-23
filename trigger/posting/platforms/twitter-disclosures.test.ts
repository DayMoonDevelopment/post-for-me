import { expect, test } from "bun:test";

// Keep SDK mocks isolated from the other platform tests.
const harness = String.raw`
import { expect, mock } from "bun:test";
const platform = JSON.parse(process.env.PLATFORM);
const account = JSON.parse(process.env.ACCOUNT);
const expected = JSON.parse(process.env.EXPECTED);
const tweet = mock(async (payload) => {
  expect(payload).toEqual({ text: "AI short film", ...expected });
  return { data: { id: "post-id" } };
});
mock.module("twitter-api-v2", () => ({
  TwitterApi: class { v2 = { tweet }; },
}));
mock.module("@trigger.dev/sdk", () => ({
  tasks: {},
  wait: { for: mock(async () => {}) },
}));
const { resolvePlatformConfiguration } = await import("../resolve-platform-configuration.ts");
const { TwitterPostClient } = await import("./twitter-post-client.ts");
const platformConfig = resolvePlatformConfiguration(platform, account);
expect(platformConfig).toEqual(expected);
const client = new TwitterPostClient({ app_id: "app", app_secret: "secret" });
const result = await client.post({
  postId: "post",
  account: { id: "account", access_token: "token", refresh_token: "refresh",
    social_provider_metadata: { connection_type: process.env.AUTH } },
  caption: "AI short film", media: [], platformConfig,
});
expect(result.success).toBe(true);
expect(tweet).toHaveBeenCalledTimes(1);
expect(result.details.requests.find(entry => entry.postRequest).postRequest).toEqual({ text: "AI short film", ...expected });
`;

for (const auth of ["oauth1", "oauth2"]) {
  for (const field of ["made_with_ai", "paid_partnership"]) {
    for (const platform of [undefined, true, false]) {
      for (const account of [undefined, true, false]) {
        test(`X ${field}: platform=${platform}, account=${account}, ${auth}`, async () => {
          const resolved = account ?? platform;
          const child = Bun.spawn([process.execPath, "--eval", harness], {
            cwd: __dirname,
            env: {
              ...process.env,
              AUTH: auth,
              PLATFORM: JSON.stringify(
                platform === undefined ? {} : { [field]: platform },
              ),
              ACCOUNT: JSON.stringify(
                account === undefined ? {} : { [field]: account },
              ),
              EXPECTED: JSON.stringify(
                resolved === undefined ? {} : { [field]: resolved },
              ),
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
}
