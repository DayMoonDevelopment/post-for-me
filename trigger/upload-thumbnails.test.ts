import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock, spyOn } from "bun:test";
const { PLATFORM: platform, SCENARIO: scenario } = process.env;
mock.module("@trigger.dev/sdk", () => ({ task: (definition) => definition }));
console.log = () => {};
console.error = () => {};
const thumbnailUrl = "https://cdn.example.com/cover.png?signature=abc";
globalThis.fetch = mock(async (url) => {
  expect(url).toBe(thumbnailUrl);
  if (scenario === "network") throw new Error("download failed");
  const headers = scenario === "missing-mime" ? {} : { "content-type": "image/png; charset=utf-8" };
  return new Response(Buffer.from("image"), { status: scenario === "http" ? 404 : 200, headers });
});
const upload = mock(async (url, init) => {
  expect(url).toBe("https://graph.example/v25.0/video/thumbnails");
  expect(init.method).toBe("POST");
  expect(init.headers["content-type"]).toStartWith("multipart/form-data; boundary=");
  const body = init.body.getBuffer().toString();
  expect(body).toContain('name="access_token"\r\n\r\ntoken');
  expect(body).toContain('name="is_preferred"\r\n\r\ntrue');
  expect(body).toContain('filename="cover.png?signature=abc"');
  expect(body).toContain("image");
  if (scenario === "upload") throw new Error("upload failed");
  return new Response(null, { status: 500 });
});
const nodeFetch = await import("node-fetch");
spyOn(nodeFetch, "default").mockImplementation(upload);
const credentials = { access_token: "current", refresh_token: "refresh", expiry_date: 123456 };
const set = mock(async (request) => {
  expect(request.videoId).toBe("video");
  expect(request.media.body).toEqual(Buffer.from("image"));
  expect(request.media.mimeType).toBe(["timestamp", "missing-mime"].includes(scenario) ? "image/jpeg" : "image/png");
  if (["upload", "retry"].includes(scenario)) throw new Error("upload failed");
  return { data: { items: [{ id: "thumbnail" }] } };
});
mock.module("googleapis", () => ({ google: {
  auth: { OAuth2: class {
    constructor(...args) { expect(args).toEqual(["id", "secret", "redirect"]); }
    setCredentials(value) { expect(value).toEqual(credentials); }
  } },
  youtube: () => ({ thumbnails: { set } }),
} }));
const task = platform === "facebook"
  ? (await import("./upload-facebook-thumbnail.ts")).uploadFacebookThumbnail
  : (await import("./upload-youtube-thumbnail.ts")).uploadYoutubeThumbnail;
expect(task.machine).toBe("medium-1x");
expect(task.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
const source = scenario === "timestamp" ? { thumbnailTimestampMs: 0 } : { thumbnailUrl };
const execute = () => task.run({
  thumbnailUrl, videoId: "video", accessToken: "token", baseUrl: "https://graph.example/v25.0",
  source, oauth: { clientId: "id", clientSecret: "secret", redirectUri: "redirect", credentials },
}, { ctx: { attempt: { number: scenario === "retry" ? 1 : 2 } } });
if (scenario === "network" || scenario === "retry" || (platform === "facebook" && scenario === "upload") || (platform === "youtube" && scenario === "http")) {
  await expect(execute()).rejects.toThrow(scenario === "network" ? "download failed" : scenario === "http" ? "Failed to download thumbnail: 404" : "upload failed");
} else {
  const result = await execute();
  if (platform === "youtube") {
    expect(result.request.thumbnailUploadRequest).toMatchObject({ videoId: "video", ...source, sizeBytes: 5 });
    if (scenario === "upload") expect(result.response.thumbnailError.error).toBe("upload failed");
    else expect(result.response.thumbnailResponse).toEqual({ items: [{ id: "thumbnail" }] });
  }
}
expect(platform === "facebook" ? upload : set).toHaveBeenCalledTimes(scenario === "network" || (platform === "youtube" && scenario === "http") ? 0 : 1);
`;

for (const platform of ["facebook", "youtube"]) {
  for (const scenario of ["success", "network", "http", "upload", ...(platform === "youtube" ? ["timestamp", "missing-mime", "retry"] : [])]) {
    test(`${platform} thumbnail upload child: ${scenario}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, PLATFORM: platform, SCENARIO: scenario },
        stdout: "pipe", stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });
  }
}
