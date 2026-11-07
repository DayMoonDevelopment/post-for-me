import { expect, test } from "bun:test";

// Each subprocess owns its SDK/storage/shadow mocks, leaving other suites untouched.
const harness = String.raw`
import { expect, mock } from "bun:test";
import { randomFillSync } from "node:crypto";
import sharp from "sharp";
const { IMAGE_KIND: kind, IMAGE_SCENARIO: scenario } = process.env;
mock.module("@trigger.dev/sdk", () => ({ task: (definition) => definition }));
const source = "https://source.example/image?token=signed";
let uploaded;
let acknowledged = false;
const enqueue = mock(async () => { await Promise.resolve(); acknowledged = true; });
mock.module("./media-server", () => ({ enqueueMediaServerJob: enqueue }));
mock.module("./media-storage", () => ({ uploadMedia: async (options) => {
  expect(acknowledged).toBe(true);
  uploaded = options;
  return "https://media.example/artifact";
} }));
const compressed = scenario.startsWith("compress");
const skip = scenario.startsWith("skip");
let width = 320, height = 240;
if (scenario === "tall" || scenario === "stories" || scenario === "reels") { width = 100; height = 400; }
if (scenario === "wide") { width = 600; height = 100; }
if (kind === "bluesky" && compressed) { width = scenario === "compress80" ? 800 : 2200; height = scenario === "compress80" ? 600 : 2200; }
if (kind === "twitter" && compressed) { width = scenario === "compress80" ? 1600 : 3300; height = scenario === "compress80" ? 1200 : 3300; }
let image = compressed
  ? sharp(randomFillSync(Buffer.alloc(width * height * 3)), { raw: { width, height, channels: 3 } })
  : sharp({ create: { width, height, channels: 3, background: "red" } });
const format = scenario.endsWith("webp") ? "webp" : scenario.endsWith("jpeg") || scenario === "exif" ? "jpeg" : scenario.endsWith("gif") ? "gif" : "png";
if (scenario === "exif") image = image.withMetadata({ orientation: 6 });
const input = await image.toFormat(format).toBuffer();
const mime = "image/" + format;
const download = mock(async () => ({ blob: async () => new Blob([input], { type: mime }) }));
globalThis.fetch = download;
const axios = mock(async (options) => { expect(options.url).toBe(source); return { data: input }; });
mock.module("axios", () => ({ default: axios }));
let expected, expectedResult, expectedMime = "image/jpeg", expectedOutput, maxBytes;
let compressionQuality;
const compress = async (buffer, limit) => {
  if (buffer.length <= limit) return buffer;
  compressionQuality = 80;
  buffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
  if (buffer.length > limit) { compressionQuality = 60; buffer = await sharp(buffer).jpeg({ quality: 60 }).toBuffer(); }
  return buffer;
};
let child, args;
if (kind === "instagram" || kind === "tiktok") {
  maxBytes = scenario === "compress60" ? 1 : scenario === "compress80" ? 100000 : 10000000;
  let targetWidth = width, targetHeight = height;
  if (kind === "instagram") {
    const limits = { minAspectRatio: 0.8, maxAspectRatio: 1.91, storiesMinAspectRatio: 0.5625, reelsMinAspectRatio: 0.6, maxFileSize: maxBytes };
    const options = { is_feed: scenario !== "reels", ...(scenario === "stories" ? { placement: "stories" } : {}), ...(scenario === "first" ? { firstImage: { width: 640, height: 640 } } : {}) };
    if (scenario === "first") { targetWidth = 640; targetHeight = 640; }
    else if (width / height > 1.91) targetWidth = Math.round(height * 1.91);
    else {
      const floor = scenario === "stories" ? 0.5625 : scenario === "reels" ? 0.6 : 0.8;
      if (width / height < floor) targetHeight = Math.round(width / floor);
    }
    ({ transformInstagramImage: child } = await import("./transform-instagram-image.ts"));
    args = { signedUrl: source, options, limits };
    expectedResult = { signedUrl: "https://media.example/artifact", width: targetWidth, height: targetHeight };
  } else {
    const allowedAspectRatios = [{ ratio: 1, width: 300, height: 300 }, { ratio: 0.75, width: 240, height: 320 }, { ratio: 1.5, width: 360, height: 240 }];
    // EXIF orientation 6 swaps the displayed dimensions before ratio selection.
    const ratio = scenario === "exif" ? height / width : width / height;
    const target = allowedAspectRatios.reduce((a, b) => Math.abs(b.ratio - ratio) < Math.abs(a.ratio - ratio) ? b : a);
    targetWidth = target.width; targetHeight = target.height;
    ({ transformTikTokImage: child } = await import("./transform-tiktok-image.ts"));
    args = { signedUrl: source, platform: "tiktok_business", maxFileSize: maxBytes, allowedAspectRatios };
    expectedResult = "https://media.example/artifact";
  }
  const initial = await sharp(input).rotate().resize({ width: targetWidth, height: targetHeight, fit: "cover" }).jpeg({ quality: 100 }).toBuffer();
  if (scenario === "compress60-fits") {
    const at80 = await sharp(initial).jpeg({ quality: 80 }).toBuffer();
    const at60 = await sharp(at80).jpeg({ quality: 60 }).toBuffer();
    maxBytes = Math.floor((at80.length + at60.length) / 2);
    if (kind === "instagram") args.limits.maxFileSize = maxBytes;
    else args.maxFileSize = maxBytes;
  }
  expected = await compress(initial, maxBytes);
  const quality = compressionQuality ?? 100;
  if (compressed) expect(quality).toBe(scenario === "compress80" ? 80 : 60);
  expectedOutput = { type: "image", format: "jpeg", quality, autoOrient: true, resize: { width: targetWidth, height: targetHeight, fit: "cover", withoutEnlargement: false } };
} else {
  ({ transformBufferedImage: child } = await import("./transform-buffered-image.ts"));
  args = { url: source, platform: kind, skipProcessing: skip };
  maxBytes = skip ? undefined : kind === "twitter" ? 5 * 1024 * 1024 : 976.56 * 1024;
  expected = input; expectedMime = mime;
  let quality;
  let resize = false;
  if (!skip && kind === "twitter") {
    expected = await compress(input, maxBytes);
    quality = compressionQuality;
  } else if (!skip) {
    expected = await sharp(input).toBuffer();
    if (input.length > maxBytes) {
      resize = true; quality = 80;
      expected = await sharp(expected).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      expectedMime = "image/jpeg";
      if (expected.length > maxBytes) { quality = 60; expected = await sharp(expected).jpeg({ quality: 60 }).toBuffer(); }
    }
  }
  if (compressed) {
    if (kind === "twitter") expect(compressionQuality).toBe(scenario === "compress80" ? 80 : 60);
    else expect(quality).toBe(scenario === "compress80" ? 80 : 60);
  }
  expectedOutput = { type: "image", format: quality !== undefined ? "jpeg" : format === "gif" ? "jpeg" : format, quality, autoOrient: resize,
    ...(resize ? { resize: { width: 2000, height: 2000, fit: "inside", withoutEnlargement: true } } : {}) };
  expectedResult = { url: "https://media.example/artifact", mimeType: expectedMime, width: kind === "bluesky" ? width : undefined, height: kind === "bluesky" ? height : undefined };
}
expect(await child.run(args)).toEqual(expectedResult);
expect(uploaded.body.equals(expected)).toBe(true);
expect(uploaded.contentType).toBe(expectedMime);
expect(uploaded.cacheControl).toBe("public, max-age=31536000");
expect(enqueue).toHaveBeenCalledTimes(1);
expect(enqueue).toHaveBeenCalledWith("transform-" + (kind === "instagram" ? "instagram" : kind === "tiktok" ? "tiktok" : "buffered") + "-image", {
  task: "media.transform-image", source, output: expectedOutput, ...(maxBytes === undefined ? {} : { maxBytes: Math.floor(maxBytes) }),
});
expect(download).toHaveBeenCalledTimes(kind === "instagram" || kind === "tiktok" ? 0 : 1);
expect(axios).toHaveBeenCalledTimes(kind === "instagram" || kind === "tiktok" ? 1 : 0);
`;

for (const kind of ["instagram", "tiktok", "bluesky", "twitter"]) {
  const scenarios = kind === "instagram"
    ? ["wide", "tall", "stories", "reels", "first", "exif", "compress80", "compress60", "compress60-fits"]
    : kind === "tiktok"
    ? ["wide", "tall", "exif", "compress80", "compress60", "compress60-fits"]
    : ["png", "jpeg", "webp", "gif", "exif", "skip-png", "skip-jpeg", "skip-webp", "skip-gif", "compress80", "compress60"];
  for (const scenario of scenarios) {
    test(`${kind} image shadow: ${scenario}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, IMAGE_KIND: kind, IMAGE_SCENARIO: scenario },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ exitCode, stderr }, stdout).toEqual({ exitCode: 0, stderr: "" });
    });
  }
}
