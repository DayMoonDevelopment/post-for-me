import { expect, mock, test } from "bun:test";

if (!process.env.PFM_TRIGGER_CONFIG_TEST_CHILD) {
  test("worker request retry configuration in an isolated process", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      env: { ...process.env, PFM_TRIGGER_CONFIG_TEST_CHILD: "1" },
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
  const configure = mock();
  mock.module("@trigger.dev/sdk", () => ({
    configure,
    defineConfig: (config: unknown) => config,
  }));
  mock.module("@trigger.dev/build/extensions/core", () => ({ ffmpeg: () => ({}) }));
  mock.module("dotenv", () => ({ config: () => ({}) }));

  test("worker init extends request retries without changing whole-task retries", async () => {
    const { default: config } = await import("./trigger.config");
    expect(config.init).toBeDefined();
    await (config.init as () => Promise<void>)();
    expect(configure).toHaveBeenCalledWith({
      requestOptions: {
        retry: {
          maxAttempts: 20,
          minTimeoutInMs: 1_000,
          maxTimeoutInMs: 60_000,
          factor: 2,
          randomize: true,
        },
      },
    });
    expect(config.retries?.default?.maxAttempts).toBe(3);
  });
}
