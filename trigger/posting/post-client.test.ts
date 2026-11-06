import { expect, test } from "bun:test";

test("interrupted media downloads remove partially staged files", async () => {
  const child = Bun.spawn([process.execPath, "--eval", String.raw`
    import { expect } from "bun:test";
    import { readdir } from "node:fs/promises";
    import { Readable } from "node:stream";
    import os from "node:os";
    import { PostClient } from "./post-client.ts";
    class Client extends PostClient {
      download(url, prefix) { return this.downloadToTempFile(url, { prefix }); }
    }
    const prefix = "interrupted_" + crypto.randomUUID();
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Headers(),
      body: Readable.from((async function* () {
        yield Buffer.alloc(1024);
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error("interrupted download");
      })()),
    });
    const client = new Client({ app_id: "", app_secret: "" });
    await expect(client.download("https://source.example/video.mp4", prefix))
      .rejects.toThrow("interrupted download");
    expect((await readdir(os.tmpdir())).filter((file) => file.startsWith(prefix))).toEqual([]);
  `], { cwd: __dirname, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
});
