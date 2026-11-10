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
  if (scenario === "download-error") throw new Error("download failed");
  if (scenario.startsWith("large-file")) {
    // Exercise the size branch without allocating hundreds of megabytes.
    const bytes = new Uint8Array(100).buffer;
    return { ok: true, body: {}, arrayBuffer: async () => ({
      byteLength: 301 * 1024 * 1024, valueOf: () => bytes,
    }) };
  }
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
    const video = { codec_type: "video", codec_name: "h264", width: 1280, height: 720, avg_frame_rate: "30/1" };
    if (scenario === "scaled" || scenario.startsWith("rotated-")) {
      video.width = 3840;
      video.height = 2160;
      if (scenario === "rotated-tag") video.tags = { rotate: "90" };
      if (scenario === "rotated-stream") video.rotation = 270;
      if (scenario === "rotated-matrix") video.side_data_list = [{ side_data_type: "Display Matrix", rotation: -90 }];
    }
    if (scenario === "odd-dimensions" || scenario === "skip-odd") {
      video.width = 1279;
      video.height = 719;
    }
    if (scenario === "low-fps") video.avg_frame_rate = "15/1";
    if (scenario === "high-fps") video.avg_frame_rate = "120/1";
    if (scenario === "frame-count") { video.nb_frames = "240"; video.avg_frame_rate = "120/1"; }
    const streams = [video];
    if (scenario === "audio") streams.push({ codec_type: "audio", codec_name: "mp3", bit_rate: "320000", channels: 6, sample_rate: "96000" });
    if (scenario === "skip-audio") streams.push({ codec_type: "audio", codec_name: "aac", bit_rate: "128000", channels: 2, sample_rate: "48000" });
    callback(null, {
      streams,
      format: {
        duration: scenario === "large-file-duration" ? 600 : 10,
        bit_rate: scenario === "high-bitrate" ? 30000000 : 1000000,
        format_name: scenario.startsWith("skip") || ["high-bitrate", "scaled", "low-fps", "high-fps", "audio"].includes(scenario) || scenario.startsWith("rotated-") || scenario.startsWith("large-file") ? "mov,mp4" : "avi",
      },
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
    const message = { "http-error": "HTTP 404", "download-error": "download failed", "encode-error": "encode failed", "upload-error": "upload failed" }[scenario];
    await expect(execute()).rejects.toThrow(message);
  } else {
    const result = await execute();
    if (scenario.startsWith("skip")) {
      expect(result).toBe(kind === "process" ? medium : url);
    } else {
      expect(result).toEqual(kind === "process" ? { ...medium, url: uploadedUrl } : uploadedUrl);
    }
  }

  expect(await fs.readdir(tempDir)).toEqual([]);
  const noEncoding = scenario.startsWith("skip") || scenario === "http-error" || scenario === "download-error";
  expect(encodeCount).toBe(noEncoding ? 0 : scenario === "final-attempt" ? 3 : 1);
  expect(uploadMedia).toHaveBeenCalledTimes(noEncoding || scenario === "encode-error" ? 0 : 1);
  if (scenario === "http-error" || scenario === "download-error" || (kind === "compress" && scenario === "skip")) expect(probeCount).toBe(0);
  for (const encoding of options) {
    expect(encoding).toContain("-c:v libx264");
    expect(encoding).toContain("-movflags +faststart");
    if (scenario !== "audio" && scenario !== "skip-audio") expect(encoding).toContain("-an");
  }
  if (kind === "process" && !noEncoding) {
    const rotated = scenario.startsWith("rotated-");
    const odd = scenario === "odd-dimensions" || scenario === "skip-odd";
    const fps = ["low-fps", "high-fps", "frame-count"].includes(scenario) ? 24 : 30;
    const scale = rotated ? { width: 1080, height: 1920 }
      : scenario === "scaled" ? { width: 1920, height: 1080 }
      : odd ? { width: 1279, height: 719 } : { width: 1280, height: 720 };
    const large = scenario.startsWith("large-file");
    const mbps = scenario === "large-file-duration" ? 3.914683 : 15;
    const hasAudio = scenario === "audio";
    expect(options[0]).toEqual([
      "-c:v libx264", "-preset " + (large ? "superfast" : "ultrafast"),
      ...(large ? ["-b:v " + mbps + "M", "-maxrate " + mbps * 1.1 + "M", "-bufsize " + mbps * 2 + "M"]
        : scenario === "high-bitrate" ? ["-b:v 24M", "-maxrate 25M", "-bufsize 50M"]
        : ["-crf 23", "-maxrate 25M", "-bufsize 50M"]),
      "-profile:v high", "-level 4.0", "-pix_fmt yuv420p", "-movflags +faststart", "-r " + fps,
      "-vf scale=" + scale.width + ":" + scale.height + ",fps=" + fps,
      ...(hasAudio ? ["-c:a aac", "-b:a 128k", "-ac 2", "-ar 48000"] : ["-an"]),
    ]);
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
  for (const scenario of ["http-error", "download-error", "encode-error", "upload-error"]) {
    cases.push({ scenario, url: sources[0] });
  }
  if (kind === "compress") cases.push({ scenario: "final-attempt", url: sources[0] });
  if (kind === "process") {
    for (const scenario of ["high-bitrate", "scaled", "rotated-stream", "rotated-tag", "rotated-matrix", "odd-dimensions", "skip-odd", "low-fps", "high-fps", "frame-count", "audio", "skip-audio", "large-file", "large-file-duration"]) {
      cases.push({ scenario, url: sources[0] });
    }
  }

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
