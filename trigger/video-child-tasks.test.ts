import { expect, test } from "bun:test";

// Run mocks in a child process to avoid replacing SDK/FFmpeg in other suites.
const harness = String.raw`
import { expect, mock } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const { VIDEO_CHILD_KIND: kind, VIDEO_CHILD_SCENARIO: scenario } = process.env;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-child-test-"));
mock.module("node:os", () => ({ default: { tmpdir: () => tempDir } }));
mock.module("@trigger.dev/sdk", () => ({ task: (definition) => definition, logger: { info() {} } }));
const url = "https://external.example.com/video?token=signed";
globalThis.fetch = mock(async (source) => {
  expect(source).toBe(url);
  if (scenario === "missing-body") return new Response(null);
  return new Response("video", { status: scenario === "http-error" ? 404 : 200 });
});
let screenshots = 0;
let probes = 0;
const ffmpeg = Object.assign((input) => {
  const handlers = {};
  const command = {
    on(event, handler) { handlers[event] = handler; return command; },
    screenshots(options) {
      screenshots++;
      expect(options).toEqual({ timestamps: [1.25], filename: path.basename(options.filename), folder: path.dirname(input) });
      expect(options.filename).toMatch(/^youtube_thumb_.*\.jpg$/);
      fs.readFile(input, "utf8").then((content) => {
        expect(content).toBe("video");
        return fs.writeFile(path.join(options.folder, options.filename), "jpeg");
      }).then(() => scenario === "ffmpeg-error" ? handlers.error(new Error("ffmpeg failed")) : handlers.end()).catch(handlers.error);
    },
  };
  return command;
}, { ffprobe(input, callback) {
  probes++;
  fs.readFile(input, "utf8").then((content) => {
    expect(content).toBe("video");
    if (scenario === "ffmpeg-error") return callback(new Error("ffmpeg failed"));
    callback(null, { streams: scenario === "no-video" ? [{ codec_type: "audio" }] : [
      { codec_type: "audio", width: 1, height: 1 },
      { codec_type: "video", width: 1920, height: 1080 },
      { codec_type: "video", width: 640, height: 480 },
    ] });
  }).catch(callback);
} });
mock.module("fluent-ffmpeg", () => ({ default: ffmpeg }));
const uploadMedia = mock(async (options) => {
  expect(await fs.readFile(options.filePath, "utf8")).toBe("jpeg");
  expect(options.contentType).toBe("image/jpeg");
  expect(options.key).toBe(path.basename(options.filePath));
  if (scenario === "upload-error") throw new Error("upload failed");
  return "https://media.example.com/artifact.jpg";
});
mock.module("./media-storage", () => ({ uploadMedia }));
try {
  const { generateYoutubeTimestampThumbnail, probeVideoDimensions } = await import("./video-child-tasks.ts");
  const task = kind === "thumbnail" ? generateYoutubeTimestampThumbnail : probeVideoDimensions;
  expect(task.machine).toBe("medium-1x");
  expect(task.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
  const execute = () => task.run({ url, timestampMs: 1250, mediaId: "unsafe/id" });
  if (scenario === "success") {
    expect(await execute()).toEqual(kind === "thumbnail" ? "https://media.example.com/artifact.jpg" : { width: 1920, height: 1080 });
  } else {
    const errors = { "http-error": "HTTP 404", "missing-body": "No response body available", "ffmpeg-error": "ffmpeg failed", "upload-error": "upload failed", "no-video": "No video stream found in file" };
    await expect(execute()).rejects.toThrow(errors[scenario]);
  }
  expect(await fs.readdir(tempDir)).toEqual([]);
  const downloaded = !["http-error", "missing-body"].includes(scenario);
  expect(screenshots).toBe(kind === "thumbnail" && downloaded ? 1 : 0);
  expect(probes).toBe(kind === "probe" && downloaded ? 1 : 0);
  expect(uploadMedia).toHaveBeenCalledTimes(kind === "thumbnail" && downloaded && scenario !== "ffmpeg-error" ? 1 : 0);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
`;

for (const kind of ["thumbnail", "probe"]) {
  const scenarios = ["success", "http-error", "missing-body", "ffmpeg-error", kind === "thumbnail" ? "upload-error" : "no-video"];
  for (const scenario of scenarios) {
    test(`${kind} child: ${scenario}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, VIDEO_CHILD_KIND: kind, VIDEO_CHILD_SCENARIO: scenario },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });
  }
}
