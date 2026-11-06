import { expect, test } from "bun:test";

// Run module mocks in a separate process so other task/platform tests stay untouched.
const harness = String.raw`
import { expect, mock } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { VIDEO_TASK: kind, VIDEO_SCENARIO: scenario, VIDEO_URL: url } = process.env;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ffmpeg-storage-test-"));
const uploadedUrl = "https://media.example.com/new-output.mp4";
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const inputs = [];
const options = [];
let probeCount = 0;
let encodeCount = 0;
const logger = { info() {}, error() {}, warn() {} };
mock.module("@trigger.dev/sdk", () => ({ logger, task: (definition) => definition }));
mock.module("@trigger.dev/sdk/v3", () => ({ logger, task: (definition) => definition }));
mock.module("os", () => ({ default: { tmpdir: () => tempDir } }));

const download = mock(async (source) => {
  expect(source).toBe(url);
  return new Response(new Uint8Array(100), { status: scenario === "http-error" ? 404 : 200 });
});
globalThis.fetch = download;

const uploadMedia = mock(async (upload) => {
  expect(upload.key).toMatch(new RegExp("^" + (kind === "process" ? "processed_" : "bluesky_") + uuid + "\\.mp4$"));
  expect(upload.contentType).toBe("video/mp4");
  expect(upload.cacheControl).toBe("public, max-age=3600");
  expect((await fs.stat(upload.filePath)).size).toBeGreaterThan(0);
  if (scenario === "upload-error") throw new Error("upload failed");
  return uploadedUrl;
});
mock.module("./media-storage", () => ({ uploadMedia }));

const ffmpeg = Object.assign((input) => {
  inputs.push(input);
  const handlers = {};
  let output;
  const command = {
    outputOptions(value) { options.push(value); return command; },
    output(value) { output = value; return command; },
    on(event, handler) { handlers[event] = handler; return command; },
    run() {
      encodeCount++;
      // Write partial output even when encoding fails, to verify cleanup.
      fs.writeFile(output, new Uint8Array(scenario === "final-attempt" ? 100 : 10))
        .then(() => scenario === "encode-error"
          ? handlers.error(new Error("encode failed"))
          : handlers.end())
        .catch(handlers.error);
    },
  };
  return command;
}, {
  ffprobe(input, callback) {
    probeCount++;
    expect(path.basename(input)).toMatch(new RegExp("^" + uuid + "\\.(mov|mp4)$"));
    callback(null, {
      streams: [{ codec_type: "video", codec_name: "h264", width: 1280, height: 720, avg_frame_rate: "30/1" }],
      format: { duration: 10, bit_rate: 1000000, format_name: scenario === "skip" ? "mov,mp4" : "avi" },
    });
  },
});
mock.module("fluent-ffmpeg", () => ({ default: ffmpeg }));

try {
  const medium = { id: "medium", url, thumbnail_url: "https://example.com/thumb.jpg", type: "video", position: 0, tags: [], skip_processing: false };
  const execute = kind === "process"
    ? async () => (await import("./ffmpeg-process-video.ts")).ffmpegProcessVideo.run({ medium })
    : async () => (await import("./ffmpeg-compress-video.ts")).ffmpegCompressVideo.run({ url, maxSizeBytes: scenario === "skip" ? 100 : 50 });

  if (scenario.endsWith("error")) {
    const message = { "http-error": "HTTP 404", "encode-error": "encode failed", "upload-error": "upload failed" }[scenario];
    await expect(execute()).rejects.toThrow(message);
  } else {
    const result = await execute();
    if (scenario === "skip") {
      expect(result).toBe(kind === "process" ? medium : url);
    } else {
      expect(result).toEqual(kind === "process" ? { ...medium, url: uploadedUrl } : uploadedUrl);
    }
  }

  expect(await fs.readdir(tempDir)).toEqual([]);
  const noEncoding = scenario === "skip" || scenario === "http-error";
  expect(encodeCount).toBe(noEncoding ? 0 : scenario === "final-attempt" ? 3 : 1);
  expect(uploadMedia).toHaveBeenCalledTimes(noEncoding || scenario === "encode-error" ? 0 : 1);
  if (scenario === "http-error" || (kind === "compress" && scenario === "skip")) expect(probeCount).toBe(0);
  for (const encoding of options) {
    expect(encoding).toContain("-c:v libx264");
    expect(encoding).toContain("-movflags +faststart");
    expect(encoding).toContain("-an");
  }
  if (scenario === "final-attempt") {
    expect(options.map((encoding) => encoding[2])).toEqual(["fast", "medium", "slow"]);
    expect(inputs[1]).not.toBe(inputs[0]);
    expect(inputs[2]).not.toBe(inputs[1]);
  }
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
`;

const sources = [
  "https://media.example.com/uploads/source.mov?token=signed#video",
  "https://pub-bucket.r2.dev/source.mp4",
  "https://project.supabase.co/storage/v1/object/public/post-media/team/source.mp4?download=1",
  "https://external.example.com/video/download?id=123",
];

for (const kind of ["process", "compress"]) {
  const cases = sources.flatMap((url) => [
    { scenario: "upload", url },
    { scenario: "skip", url },
  ]);
  for (const scenario of ["http-error", "encode-error", "upload-error"]) {
    cases.push({ scenario, url: sources[0] });
  }
  if (kind === "compress") cases.push({ scenario: "final-attempt", url: sources[0] });

  for (const { scenario, url } of cases) {
    test(`${kind}: ${scenario} (${url})`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, VIDEO_TASK: kind, VIDEO_SCENARIO: scenario, VIDEO_URL: url },
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
