import { expect, mock, test } from "bun:test";

// Isolate module mocks from the coordinator and transport test suites.
if (!process.env.PFM_MEDIA_SHADOW_TEST_CHILD) {
  test("media-shadow polling uses concurrent-safe timers", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      cwd: __dirname,
      env: { ...process.env, PFM_MEDIA_SHADOW_TEST_CHILD: "1" },
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
  test("task wiring allows overlapping polling sleeps without durable waits", async () => {
    const delays: number[] = [];
    let activeTimers = 0;
    let peakTimers = 0;
    const durableWait = mock(async () => { throw new Error("Parallel waits are not supported"); });
    mock.module("@trigger.dev/sdk", () => ({
      task: (definition: unknown) => definition,
      tags: { add: async () => {} },
      logger: {},
      AbortTaskRunError: Error,
      wait: { for: durableWait },
    }));
    mock.module("node:timers/promises", () => ({
      setTimeout: async (ms: number) => {
        delays.push(ms);
        peakTimers = Math.max(peakTimers, ++activeTimers);
        await new Promise<void>((resolve) => setImmediate(resolve));
        activeTimers--;
      },
    }));
    mock.module("./media-server", () => ({ createMediaServerTransport: () => ({}) }));
    mock.module("./media-shadow-coordinator", () => ({
      SHADOW_MAX_DURATION_SECONDS: 480,
      coordinateShadowMedia: async (_post: unknown, _runId: string, deps: { sleep: (seconds: number) => Promise<unknown> }) => {
        await Promise.all([deps.sleep(10), deps.sleep(10), deps.sleep(0.5)]);
        return { status: "completed" };
      },
    }));
    const originalRedisUrl = process.env.MEDIA_SERVER_REDIS_URL;
    process.env.MEDIA_SERVER_REDIS_URL = "redis://localhost:6379";
    try {
      const { mediaShadow } = await import("./media-shadow");
      const run = (mediaShadow as unknown as { run: (payload: unknown, context: unknown) => Promise<unknown> }).run;
      expect(await run({ postId: "post", projectId: "project" }, { ctx: { run: { id: "run" } } })).toEqual({ status: "completed" });
      expect(delays).toEqual([10000, 10000, 500]);
      expect(peakTimers).toBe(3);
      expect(durableWait).not.toHaveBeenCalled();
    } finally {
      if (originalRedisUrl === undefined) delete process.env.MEDIA_SERVER_REDIS_URL;
      else process.env.MEDIA_SERVER_REDIS_URL = originalRedisUrl;
    }
  });
}
