import { expect, mock, test } from "bun:test";
import { createLiveMediaExecutor, normalizeLiveVideo, prepareLiveBlueskyVideo, transformLiveImage, ZenithWorkerError } from "./live-media";
import type { StoredMedia } from "./media-shadow-recipes";
import type { MediaServerTransport, MediaServerJob } from "./media-server";

const image = (versionId = "source", size = 100): StoredMedia => ({
  fileId: "file", versionId, path: "publishing/file", url: `https://media.example/${versionId}`,
  size, contentType: "image/jpeg",
  media: { kind: "image", width: 600, height: 1200, orientation: 1, format: "jpeg", hasAlpha: false },
});
const video = (versionId = "source", size = 200_000_000): StoredMedia => ({
  ...image(versionId, size), contentType: "video/mp4",
  media: { kind: "video", width: 1920, height: 1080, container: "mp4", rotation: 0, durationSeconds: 60,
    bitrate: 10_000_000, frameRate: 30, video: { codec: "h264", profile: "high", level: 40, pixelFormat: "yuv420p", bitrate: 10_000_000 }, audio: null },
});

function executor(outcome: unknown = { ok: true, output: image() }, tokenOk = true) {
  const enqueue = mock<MediaServerTransport["enqueue"]>(async () => {});
  const createToken = mock(async () => ({ id: "token", url: "https://secret.example/callback" }));
  const forToken = mock(async () => tokenOk
    ? { ok: true as const, output: outcome } : { ok: false as const, error: new Error("timeout") });
  const log = mock(() => {});
  const execute = createLiveMediaExecutor("run", { transport: { enqueue }, wait: { createToken, forToken }, log });
  return { execute, enqueue, createToken, forToken, log };
}

test("completed output is propagated; deterministic IDs, live prefix and secrets are redacted", async () => {
  const deps = executor();
  expect(await deps.execute("localize", "medium", { task: "media.localize", url: "https://source.example/private" })).toEqual(image());
  const first = deps.enqueue.mock.calls[0];
  expect(first[0]).toMatchObject({ queue: "trigger-interop", path: expect.stringMatching(/^publishing\/run\//) });
  expect(first[2]).toEqual({ url: "https://secret.example/callback" });
  await deps.execute("localize", "medium", { task: "media.localize", url: "https://source.example/private" });
  expect(deps.enqueue.mock.calls[1][0]).toEqual(first[0]);
  expect(JSON.stringify(deps.log.mock.calls)).not.toContain("https://");
  expect(JSON.stringify(deps.log.mock.calls)).not.toContain("secret.example");
});

test("bounded enqueue retries reuse job/token and never wait after all enqueues fail", async () => {
  const deps = executor();
  deps.enqueue.mockRejectedValue(new Error("redis://user:secret@host"));
  await expect(deps.execute("localize", "medium", { task: "media.localize", url: "source" })).rejects.toThrow("enqueue failed");
  expect(deps.enqueue).toHaveBeenCalledTimes(3);
  expect(deps.createToken).toHaveBeenCalledTimes(1);
  expect(deps.forToken).not.toHaveBeenCalled();
  expect(JSON.stringify(deps.log.mock.calls)).not.toContain("secret");
});

for (const stage of ["create", "wait"]) {
  test(`waitpoint ${stage} rejection fails explicitly without exposing secrets`, async () => {
    const deps = executor();
    (stage === "create" ? deps.createToken : deps.forToken).mockRejectedValue(new Error("https://secret.example/callback"));
    await expect(deps.execute("localize", "id", { task: "media.localize", url: "source" })).rejects.toThrow(stage === "create" ? "creation failed" : "wait failed");
    expect(JSON.stringify(deps.log.mock.calls)).not.toContain("secret.example");
    if (stage === "create") expect(deps.enqueue).not.toHaveBeenCalled();
  });
}

for (const [name, outcome, ok, error] of [
  ["timeout", null, false, "timed out"],
  ["invalid envelope", { ok: "true" }, true, "Invalid Zenith"],
  ["invalid output", { ok: true, output: { url: "bad" } }, true, "Invalid Zenith"],
  ["invalid error", { ok: false, error: {} }, true, "Invalid Zenith"],
  ["worker failure", { ok: false, error: { code: "FAILED", message: "worker failed" } }, true, "worker failed"],
] as const) {
  test(`${name} is not successful processing`, async () => {
    await expect(executor(outcome, ok).execute("localize", "medium", { task: "media.localize", url: "source" })).rejects.toThrow(error);
  });
}

test("image compression chains completed versions and returns the final URL/content type/metadata", async () => {
  let pass = 0;
  const execute = mock(async () => ({ ...image(`pass-${++pass}`, pass < 3 ? 10_000_000 : 100), contentType: "image/jpeg" }));
  const fallback = mock(async () => image("legacy"));
  const result = await transformLiveImage(image(), "id", "instagram", {}, execute, fallback);
  expect(result.url).toEndWith("pass-3");
  expect(execute.mock.calls.map((call: any) => call[2].source.versionId)).toEqual(["source", "pass-1", "pass-2"]);
  expect(fallback).not.toHaveBeenCalled();
});

test("Instagram carousel uses completed first-image geometry, not localization dimensions", async () => {
  const execute = mock(async (_stage: string, _id: string, job: any) => ({
    ...image("cropped"), media: { ...image().media, kind: "image" as const, width: job.output.resize.width, height: job.output.resize.height },
  } as StoredMedia));
  const fallback = async () => image();
  const first = await transformLiveImage(image(), "1", "instagram", { isFeed: true }, execute, fallback);
  expect(first.media).toMatchObject({ width: 600, height: 800 });
  await transformLiveImage(image(), "2", "instagram", { firstImage: { width: 600, height: 800 } }, execute, fallback);
  expect(execute.mock.calls[1][2].output.resize).toMatchObject({ width: 600, height: 800 });
});

for (const [error, fallbackExpected] of [
  [new ZenithWorkerError("UNSUPPORTED", "Animated images are not supported"), true],
  [new ZenithWorkerError("FAILED", "decode failed"), false],
  [new Error("Animated images are not supported"), false],
] as const) {
  test(`animation fallback is targeted: ${error.constructor.name}/${error.message}`, async () => {
    const fallback = mock(async () => image("legacy"));
    const operation = transformLiveImage(image(), "id", "instagram", {}, async () => { throw error; }, fallback);
    if (fallbackExpected) expect((await operation).versionId).toBe("legacy");
    else await expect(operation).rejects.toBe(error);
    expect(fallback).toHaveBeenCalledTimes(fallbackExpected ? 1 : 0);
  });
}

test("generic video passes accept/maxBytes and propagates actual normalized output", async () => {
  const execute = mock(async (_stage: string, _id: string, _job: MediaServerJob) => video("normalized", 10));
  expect(await normalizeLiveVideo(video(), "id", execute)).toEqual(video("normalized", 10));
  expect(execute.mock.calls[0][2]).toMatchObject({ source: { fileId: "file", versionId: "source" }, maxBytes: 300 * 1024 * 1024, accept: { containers: ["mp4"] } });
});

test("Bluesky compression chains versions; skip avoids all transforms and keeps metadata", async () => {
  let pass = 0;
  const execute = mock(async () => video(`pass-${++pass}`, pass < 2 ? 150_000_000 : 90_000_000));
  const source = video();
  expect(await prepareLiveBlueskyVideo(source, "id", true, execute)).toBe(source);
  expect(execute).not.toHaveBeenCalled();
  expect((await prepareLiveBlueskyVideo(source, "id", false, execute)).versionId).toBe("pass-2");
  expect(execute.mock.calls.map((call: any) => call[2].source.versionId)).toEqual(["source", "pass-1"]);
});
