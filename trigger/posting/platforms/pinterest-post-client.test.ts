import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock, spyOn } from "bun:test";
import axios from "axios";
const scenario = process.env.SCENARIO;
const calls = [];
const child = mock(async () => {
  if (scenario === "child-error") return { ok: false, error: { message: "upload task failed" } };
  throw new Error("Images must not use a video child");
});
mock.module("@trigger.dev/sdk", () => ({ tasks: { triggerAndWait: child }, wait: {} }));
spyOn(axios, "get").mockImplementation(async (url) => {
  calls.push("boards");
  expect(url).toBe("https://api.pinterest.com/v5/boards");
  return { data: { items: [] } };
});
spyOn(axios, "post").mockImplementation(async (url, body, options) => {
  expect(options.headers.Authorization).toBe("Bearer access");
  if (url.endsWith("/boards")) {
    calls.push("create-board");
    expect(body).toEqual({ name: "Post For Me", description: "Posts from Post For Me" });
    return { data: { id: "board" } };
  }
  calls.push("publish");
  expect(url).toBe("https://api.pinterest.com/v5/pins");
  expect(body).toEqual({ board_id: "board", title: "caption", description: "caption", link: undefined, media_source: { source_type: "image_url", url: "https://source.example/image" } });
  return { data: { id: "pin" } };
});
console.error = () => {};
globalThis.fetch = async () => { throw new Error("No source GET in parent"); };
const { PinterestPostClient } = await import("./pinterest-post-client.ts");
const client = new PinterestPostClient({ app_id: "app", app_secret: "secret" });
const result = await client.post({ postId: "post", account: { id: "account", access_token: "access" }, caption: "caption", media: scenario === "empty" ? [] : [{ type: scenario === "child-error" ? "video" : "image", url: "https://source.example/image" }], platformConfig: {} });
expect(result.success).toBe(scenario === "image");
if (scenario === "image") {
  expect(calls).toEqual(["boards", "create-board", "publish"]);
  expect(child).not.toHaveBeenCalled();
} else {
  expect(result.error_message).toBe("Failed to post to Pinterest");
  expect(result.details.error).toBe(scenario === "empty" ? "No files to post" : "upload task failed");
  expect(calls).not.toContain("publish");
}
`;

for (const scenario of ["image", "empty", "child-error"]) {
  test(`Pinterest parent boundary: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname, env: { ...process.env, SCENARIO: scenario }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}
