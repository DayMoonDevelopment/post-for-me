import { afterEach, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import type { IndividualPostData, Post } from "./posting/post.types";

// Task and client mocks must not leak into other tests' module caches.
if (!process.env.PFM_PROCESS_POST_STORAGE_TEST_CHILD) {
  test("process-post storage payloads in an isolated process", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      cwd: __dirname,
      env: { ...process.env, PFM_PROCESS_POST_STORAGE_TEST_CHILD: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, output: exitCode === 0 ? "" : stdout + stderr }).toEqual({
      exitCode: 0,
      output: "",
    });
  });
} else {
  const originalMediaServerRedisUrl = process.env.MEDIA_SERVER_REDIS_URL;
  let rejectShadowSchedule = false;
  const credentials = {
    provider: "facebook",
    app_id: "project-app-id",
    app_secret: "project-app-secret",
  };
  const project = {
    is_system: false,
    team_id: "team-id",
    teams: { stripe_customer_id: "customer-id" },
    social_provider_app_credentials: [credentials],
  };
  const post: Post = {
    id: "post-id",
    project_id: "project-id",
    api_key: "api-key-id",
    caption: "caption",
    post_at: "2026-11-05T00:00:00Z",
    social_post_provider_connections: ["account-1", "account-2"].map((id) => ({
      social_provider_connections: {
        id,
        provider: "facebook",
        social_provider_user_name: id,
        social_provider_user_id: id,
        access_token: "access-token",
        refresh_token: null,
        access_token_expires_at: null,
        refresh_token_expires_at: null,
        social_provider_metadata: {},
      },
    })),
    social_post_media: [],
    social_post_configurations: [],
  };
  const medium = {
    id: "image-id",
    url: "https://media.example.com/localized.jpg",
    thumbnail_url: "",
    type: "image",
    position: 0,
  };
  const projectSingle = mock(async () => ({ data: project, error: null }));
  const projectEq = mock(() => ({ single: projectSingle }));
  const projectSelect = mock((_selection: string) => ({ eq: projectEq }));
  const updatedSingle = mock(async () => ({
    data: { ...post, status: "processed" },
    error: null,
  }));
  const updatedOrder = mock(() => ({ single: updatedSingle }));
  const updatedSelect = mock(() => ({ order: updatedOrder }));
  const updatedEq = mock(() => ({ select: updatedSelect }));
  const update = mock(() => ({ eq: updatedEq }));
  const from = mock((table: string) => {
    if (table === "projects") return { select: projectSelect };
    if (table === "social_posts") return { update };
    throw new Error(`Unexpected table: ${table}`);
  });
  const getKey = mock(async () => ({ data: { enabled: true } }));
  const batchTriggerAndWait = mock(async (id: string, _items: unknown[]) => {
    if (id === "process-post-medium") {
      return { runs: [{ ok: true, output: medium }] };
    }
    if (id === "post-to-platform") return { runs: [] };
    throw new Error(`Unexpected batch task: ${id}`);
  });
  const triggerAndWait = mock(async (_id: string, _payload: IndividualPostData) => ({ ok: true }));
  const trigger = mock(async (id: string, _payload: unknown) => {
    if (id === "media-shadow" && rejectShadowSchedule) {
      throw new Error("Shadow scheduling unavailable");
    }
    return { id: `${id}-run-id` };
  });
  const batchTrigger = mock(async () => {});
  const addTags = mock(async (_tags: string | string[]) => {});
  const logError = mock();
  const logWarn = mock();
  const waitFor = mock(async () => {});

  mock.module("@supabase/supabase-js", () => ({ createClient: () => ({ from }) }));
  mock.module("@unkey/api", () => ({ Unkey: class { keys = { getKey }; } }));
  mock.module("@trigger.dev/sdk", () => ({
    task: (definition: unknown) => definition,
    tasks: { batchTriggerAndWait, triggerAndWait, trigger, batchTrigger },
    tags: { add: addTags },
    logger: { info: mock(), warn: logWarn, error: logError },
    wait: { for: waitFor },
  }));

  let run: (payload: { index: number; post: Post }) => Promise<unknown>;
  beforeAll(async () => {
    const { processPost } = await import("./process-post");
    run = (processPost as unknown as { run: typeof run }).run;
  });
  beforeEach(() => {
    delete process.env.MEDIA_SERVER_REDIS_URL;
    rejectShadowSchedule = false;
    for (const fn of [
      projectSingle, projectEq, projectSelect, updatedSingle, updatedOrder,
      updatedSelect, updatedEq, update, from, getKey, batchTriggerAndWait,
      triggerAndWait, trigger, batchTrigger, addTags, logError, logWarn, waitFor,
    ]) fn.mockClear();
  });
  afterEach(() => {
    if (originalMediaServerRedisUrl === undefined) {
      delete process.env.MEDIA_SERVER_REDIS_URL;
    } else {
      process.env.MEDIA_SERVER_REDIS_URL = originalMediaServerRedisUrl;
    }
  });

  for (const mode of ["enabled", "disabled", "rejected"] as const) {
    test(`media-shadow ${mode}: live localization and publishing proceed independently`, async () => {
      if (mode !== "disabled") {
        process.env.MEDIA_SERVER_REDIS_URL = "redis://shadow.example.com";
      }
      rejectShadowSchedule = mode === "rejected";
      const configCredentials = {
        access_token: "config-token", refresh_token: "config-refresh-token",
        api_key: "config-api-key", app_id: credentials.app_id, app_secret: credentials.app_secret,
      };
      const input: Post = {
        ...post,
        social_post_provider_connections: post.social_post_provider_connections.map(
          ({ social_provider_connections: connection }) => ({
            social_provider_connections: { ...connection, refresh_token: "refresh-token" },
          }),
        ),
        social_post_media: [{
          id: medium.id, url: "https://external.example.com/original.jpg",
          thumbnail_url: "https://external.example.com/thumbnail.jpg",
          thumbnail_timestamp_ms: 1234, provider: null, provider_connection_id: null,
          alt_text: "Private alt text", tags: null, skip_processing: true, index: 0,
        }],
        social_post_configurations: [{
          provider: "facebook", provider_connection_id: null,
          caption: "Private platform caption",
          provider_data: {
            placement: "reels", share_to_feed: false,
            ...configCredentials,
          },
        }, {
          provider: null, provider_connection_id: "account-2",
          caption: "Private account caption",
          provider_data: { placement: "reels", share_to_feed: true, ...configCredentials },
        }],
      };

      await run({ index: 0, post: input });

      const shadowCalls = trigger.mock.calls.filter(([id]) => id === "media-shadow");
      expect(shadowCalls).toEqual(mode === "disabled" ? [] : [["media-shadow", {
        postId: post.id,
        projectId: post.project_id,
        media: [{
          id: medium.id, url: "https://external.example.com/original.jpg",
          thumbnail_url: "https://external.example.com/thumbnail.jpg",
          thumbnail_timestamp_ms: 1234, provider: null, provider_connection_id: null,
          skip_processing: true, index: 0,
        }],
        accounts: [
          { id: "account-1", provider: "facebook" },
          { id: "account-2", provider: "facebook" },
        ],
        configurations: [{
          provider: "facebook", provider_connection_id: null,
          provider_data: { placement: "reels", share_to_feed: false },
        }, {
          provider: null, provider_connection_id: "account-2",
          provider_data: { placement: "reels", share_to_feed: true },
        }],
      }]]);
      expect(trigger.mock.calls.map(([id]) => id)).toEqual(mode === "disabled"
        ? ["process-webhooks"] : ["media-shadow", "process-webhooks"]);
      // Only scheduling returns a handle; no shadow completion is supplied or awaited.
      expect(batchTriggerAndWait.mock.calls.map(([id]) => id)).toEqual([
        "process-post-medium", "post-to-platform",
      ]);
      expect(batchTriggerAndWait.mock.calls[0][1]).toEqual([{
        payload: { medium: {
          id: medium.id, url: "https://external.example.com/original.jpg",
          thumbnail_url: "https://external.example.com/thumbnail.jpg",
          thumbnail_timestamp_ms: 1234, provider: null, provider_connection_id: null,
          alt_text: "Private alt text", tags: null, skip_processing: true, position: 0,
        } },
      }]);
      const published = batchTriggerAndWait.mock.calls[1][1] as { payload: IndividualPostData }[];
      expect(published).toHaveLength(2);
      for (const [index, { payload }] of published.entries()) {
        expect(payload).toMatchObject({
          account: { id: `account-${index + 1}`, access_token: "access-token", refresh_token: "refresh-token" },
          media: [medium], appCredentials: credentials,
        });
      }
      expect(triggerAndWait).not.toHaveBeenCalled();
      expect(batchTrigger).not.toHaveBeenCalled();
      expect(logError).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith({ status: "processed" });
      if (mode === "rejected") {
        expect(logWarn).toHaveBeenCalledWith(
          "Shadow media coordinator scheduling failed; continuing live processing",
          { postId: post.id },
        );
      } else {
        expect(logWarn).not.toHaveBeenCalled();
      }
    });
  }

  for (const isSystem of [true, false]) {
    for (const story of [false, true]) {
      test(`${story ? "sequential stories" : "normal batch"} preserves is_system=${isSystem} and project credentials`, async () => {
        project.is_system = isSystem;
        const input: Post = {
          ...post,
          social_post_media: story ? [{
            id: medium.id, url: "https://external.example.com/image.jpg",
            thumbnail_url: null, thumbnail_timestamp_ms: null,
            provider: null, provider_connection_id: null,
            alt_text: null, tags: null, skip_processing: true, index: 0,
          }] : [],
          social_post_configurations: story ? [{
            provider: "facebook", provider_connection_id: null,
            caption: null, provider_data: { placement: "stories" },
          }] : [],
        };

        await run({ index: 0, post: input });

        expect(logError).not.toHaveBeenCalled();
        expect(getKey).toHaveBeenCalledWith({ keyId: post.api_key });
        expect(waitFor).not.toHaveBeenCalled();
        expect(from.mock.calls).toEqual([["projects"], ["social_posts"]]);
        expect(projectSelect).toHaveBeenCalledTimes(1);
        const selection = projectSelect.mock.calls[0];
        expect(selection[0]).toMatch(/\*/);
        expect(selection[0]).toContain("social_provider_app_credentials");
        expect(projectEq).toHaveBeenCalledWith("id", post.project_id);
        expect(projectSingle).toHaveBeenCalledTimes(1);
        expect(addTags.mock.calls).toEqual([[[post.id, post.project_id]], [project.team_id]]);
        expect(update).toHaveBeenCalledWith({ status: "processed" });
        expect(updatedEq).toHaveBeenCalledWith("id", post.id);
        expect(updatedOrder).toHaveBeenCalledWith("index", { referencedTable: "social_post_media" });
        expect(updatedSingle).toHaveBeenCalledTimes(1);
        expect(trigger).toHaveBeenCalledWith("process-webhooks", expect.objectContaining({
          projectId: post.project_id,
          eventType: "social.post.updated",
          eventData: expect.objectContaining({ id: post.id, status: "processed" }),
        }));
        expect(batchTrigger).not.toHaveBeenCalled();

        const batches = batchTriggerAndWait.mock.calls;
        expect(batches.map(([id]) => id)).toEqual(story
          ? ["process-post-medium"] : ["post-to-platform"]);
        const payloads = story
          ? triggerAndWait.mock.calls.map(([id, payload]) => {
            expect(id).toBe("post-to-platform");
            return payload;
          })
          : (batches[0][1] as { payload: IndividualPostData }[]).map(({ payload }) => payload);
        expect(triggerAndWait).toHaveBeenCalledTimes(story ? 2 : 0);
        expect(payloads).toHaveLength(2);
        for (const [index, payload] of payloads.entries()) {
          expect(payload).toMatchObject({
            isSystemProject: isSystem,
            appCredentials: credentials,
            projectId: post.project_id,
            teamId: project.team_id,
            stripeCustomerId: project.teams.stripe_customer_id,
            account: { id: `account-${index + 1}` },
            media: story ? [medium] : [],
            platformConfig: story ? { placement: "stories" } : {},
          });
          expect(payload.appCredentials).toBe(credentials);
        }
      });
    }
  }
}
