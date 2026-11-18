import { expect, mock, test } from "bun:test";

// Isolate module mocks from the coordinator and transport test suites.
if (!process.env.PFM_MEDIA_SHADOW_TEST_CHILD) {
  test("media-shadow hands the coordinator Trigger's token waits", async () => {
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
  test("task wiring delegates to wait.createToken and wait.forToken, and the kill switch disables it", async () => {
    const created = mock(async (options: unknown) => ({ id: "waitpoint_1", url: "https://trigger.example/cb", options }));
    const waited = mock((token: unknown) => Promise.resolve({ ok: true, output: token }));
    mock.module("@trigger.dev/sdk", () => ({
      task: (definition: unknown) => definition,
      tags: { add: async () => {} },
      logger: {},
      AbortTaskRunError: Error,
      wait: { createToken: created, forToken: waited },
    }));
    mock.module("./media-server", () => ({ createMediaServerTransport: () => ({}) }));
    mock.module("./media-shadow-coordinator", () => ({
      SHADOW_MAX_DURATION_SECONDS: 600,
      coordinateShadowMedia: async (_post: unknown, _runId: string, deps: {
        wait: { createToken: (options: unknown) => Promise<unknown>; forToken: (token: unknown) => PromiseLike<unknown> };
      }) => {
        const token = await deps.wait.createToken({ timeout: "10m" });
        expect(await deps.wait.forToken(token)).toEqual({ ok: true, output: token });
        return { status: "completed" };
      },
    }));
    const original = process.env.MEDIA_SERVER_REDIS_URL;
    try {
      const { mediaShadow } = await import("./media-shadow");
      const run = (mediaShadow as unknown as { run: (payload: unknown, context: unknown) => Promise<unknown> }).run;
      delete process.env.MEDIA_SERVER_REDIS_URL;
      expect(await run({ postId: "post", projectId: "project" }, { ctx: { run: { id: "run" } } })).toEqual({ status: "disabled" });
      expect(created).not.toHaveBeenCalled();
      process.env.MEDIA_SERVER_REDIS_URL = "redis://localhost:6379";
      expect(await run({ postId: "post", projectId: "project" }, { ctx: { run: { id: "run" } } })).toEqual({ status: "completed" });
      expect(created).toHaveBeenCalledTimes(1);
      expect(waited).toHaveBeenCalledTimes(1);
    } finally {
      if (original === undefined) delete process.env.MEDIA_SERVER_REDIS_URL;
      else process.env.MEDIA_SERVER_REDIS_URL = original;
    }
  });
}
