import { beforeAll, beforeEach, expect, mock, test } from "bun:test";
import type { IndividualPostData } from "./posting/post.types";

if (!process.env.PFM_PLATFORM_STORAGE_TEST_CHILD) {
  test("post-to-platform storage gating in an isolated process", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      env: { ...process.env, PFM_PLATFORM_STORAGE_TEST_CHILD: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, output: exitCode === 0 ? "" : stdout + stderr }).toEqual({ exitCode: 0, output: "" });
  });
} else {
  const post = mock(async () => ({ success: true, post_id: "post-id", provider_connection_id: "account-id" }));
  const constructed = mock((..._args: unknown[]) => {});
  const inserted: unknown[] = [];
  const from = mock((table: string) => {
    if (table === "social_post_results") return {
      insert: (result: object) => {
        inserted.push(result);
        return { select: () => ({ single: async () => ({ data: { id: "result-id", ...result }, error: null }) }) };
      },
    };
    if (table === "social_post_result_post_media") return { insert: async () => ({ error: null }) };
    throw new Error(`Unexpected table: ${table}`);
  });
  mock.module("@supabase/supabase-js", () => ({ createClient: () => ({ from }) }));
  mock.module("@trigger.dev/sdk", () => ({
    task: (definition: unknown) => definition,
    tags: { add: mock(async () => {}) },
    logger: { info: mock(), warn: mock(), error: mock() },
    tasks: { trigger: mock(async () => {}) },
    idempotencyKeys: { create: mock(async () => "key") },
  }));
  mock.module("stripe", () => ({ default: class {
    billing = { meterEvents: { create: mock(async () => ({})) } };
  } }));
  for (const [file, name] of [
    ["twitter", "Twitter"], ["instagram", "Instagram"], ["facebook", "Facebook"],
    ["linkedin", "LinkedIn"], ["tiktok", "TikTok"], ["bluesky", "Bluesky"],
    ["threads", "Threads"], ["pinterest", "Pinterest"], ["youtube", "YouTube"],
    ["tiktok_business", "TikTokBusiness"],
  ]) {
    mock.module(`./posting/platforms/${file}-post-client`, () => ({
      [`${name}PostClient`]: class {
        supportedMediaTypes = ["image", "video"];
        post = post;
        constructor(...args: unknown[]) { constructed(file, ...args); }
      },
    }));
  }
  let run: (payload: IndividualPostData) => Promise<any>;
  beforeAll(async () => {
    const { postToPlatform } = await import("./post-to-platform");
    // The task mock exposes the registered run callback instead of a task handle.
    run = (postToPlatform as unknown as { run: typeof run }).run;
  });
  test("posting starts small and retains the larger-machine OOM retry", async () => {
    const { postToPlatform } = await import("./post-to-platform");
    const definition = postToPlatform as unknown as {
      machine: string;
      retry: { maxAttempts: number; outOfMemory: { machine: string } };
    };
    expect(definition.machine).toBe("small-1x");
    expect(definition.retry.maxAttempts).toBe(2);
    expect(definition.retry.outOfMemory.machine).toBe("large-1x");
  });
  const credentials = { app_id: "app-id", app_secret: "app-secret" };
  const payload = (platform = "tiktok") => ({
    platform, projectId: "project-id", isSystemProject: false, postId: "post-id", teamId: "team-id",
    stripeCustomerId: "customer-id", appCredentials: credentials, caption: "caption",
    platformConfig: {}, media: [{ id: "media-id", type: "image", url: "https://media.example.com/photo.jpg" }],
    account: { id: "account-id", provider: platform, access_token_expires_at: new Date(Date.now() + 30 * 86400000) },
  }) as IndividualPostData;
  beforeEach(() => {
    for (const fn of [post, constructed, from]) fn.mockClear();
    inserted.length = 0;
  });

  for (const isSystem of [true, false]) {
    test(`TikTok is_system=${isSystem} passes the strict storage flag to the client`, async () => {
      expect((await run({ ...payload(), isSystemProject: isSystem })).success).toBe(true);
      expect(from.mock.calls.some(([table]) => table === "projects")).toBe(false);
      expect(constructed).toHaveBeenCalledWith("tiktok", credentials, !isSystem);
      expect(post).toHaveBeenCalledTimes(1);
      expect(inserted).toHaveLength(1);
    });
  }

  for (const platform of ["x", "instagram", "facebook", "linkedin", "bluesky", "threads", "pinterest", "youtube", "tiktok_business"]) {
    test(`${platform} does not query project storage or receive a storage flag`, async () => {
      // Avoid the unrelated always-refresh path while exercising each factory branch.
      const input = payload(platform);
      input.account.provider = "tiktok";
      expect((await run(input)).success).toBe(true);
      expect(from.mock.calls.some(([table]) => table === "projects")).toBe(false);
      expect(constructed).toHaveBeenCalledWith(platform === "x" ? "twitter" : platform, credentials);
      expect(post).toHaveBeenCalledTimes(1);
    });
  }

  for (const value of [undefined, null, "false", "true", 0, 1, {}, []]) {
    test(`nonboolean ${String(value)} defaults to system-project behavior`, async () => {
      const result = await run({ ...payload(), isSystemProject: value } as unknown as IndividualPostData);
      expect(result.success).toBe(true);
      expect(constructed).toHaveBeenCalledWith("tiktok", credentials, false);
      expect(post).toHaveBeenCalledTimes(1);
      expect(from.mock.calls.some(([table]) => table === "projects")).toBe(false);
      expect(inserted).toEqual([result]);
    });
  }

}
