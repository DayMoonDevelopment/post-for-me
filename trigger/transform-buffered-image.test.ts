import { expect, test } from "bun:test";

// Keep SDK/storage mocks isolated from the platform suites.
const harness = String.raw`
import { expect, mock } from "bun:test";
import sharp from "sharp";
import { randomFillSync } from "node:crypto";
const platform = process.env.PLATFORM;
const scenario = process.env.SCENARIO;
mock.module("@trigger.dev/sdk", () => ({ task: (definition) => definition }));
mock.module("./media-server", () => ({ enqueueMediaServerJob: async () => {} }));
let uploaded;
mock.module("./media-storage", () => ({ uploadMedia: async (options) => {
  uploaded = options;
  if (scenario === "upload-error") throw new Error("upload failed");
  return "https://media.example/artifact";
} }));
const large = scenario === "large";
const input = large
  ? await sharp(randomFillSync(Buffer.alloc(3300 * 3300 * 3)), { raw: { width: 3300, height: 3300, channels: 3 } }).png().toBuffer()
  : await sharp({ create: { width: 23, height: 17, channels: 3, background: "red" } }).png().toBuffer();
const buffer = input;
const mimeType = scenario === "no-mime" ? "" : "image/png";
globalThis.fetch = mock(async (url) => {
  expect(url).toBe("https://source.example/image");
  return { blob: async () => new Blob([buffer], { type: mimeType }) };
});
const { transformBufferedImage: child } = await import("./transform-buffered-image.ts");
expect(child.machine).toBe("medium-1x");
expect(child.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
const skipProcessing = scenario === "skip";
const execute = () => child.run({ url: "https://source.example/image", platform, skipProcessing });
if (scenario === "upload-error") {
  await expect(execute()).rejects.toThrow("upload failed");
} else {
  const result = await execute();
  let expected = buffer;
  let expectedMime = mimeType;
  if (platform === "bluesky") {
    expectedMime ||= "image/jpeg";
    if (!skipProcessing) {
      expected = await sharp(buffer).toBuffer();
      if (buffer.length > 976.56 * 1024) {
        expected = await sharp(expected).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
        expectedMime = "image/jpeg";
        expect(expected.length).toBeGreaterThan(976.56 * 1024);
        if (expected.length > 976.56 * 1024) expected = await sharp(expected).jpeg({ quality: 60 }).toBuffer();
      }
    }
  } else if (!skipProcessing && buffer.length > 5 * 1024 * 1024) {
    expected = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
    expect(expected.length).toBeGreaterThan(5 * 1024 * 1024);
    if (expected.length > 5 * 1024 * 1024) expected = await sharp(expected).jpeg({ quality: 60 }).toBuffer();
  }
  expect(uploaded.body.equals(expected)).toBe(true);
  expect(uploaded.contentType).toBe(expectedMime);
  expect(result).toEqual({ url: "https://media.example/artifact", mimeType: expectedMime,
    width: platform === "bluesky" ? (large ? 3300 : 23) : undefined,
    height: platform === "bluesky" ? (large ? 3300 : 17) : undefined });
}
console.log = () => {};
`;

for (const platform of ["bluesky", "twitter"]) {
  for (const scenario of ["small", "large", "skip", "no-mime", "upload-error"]) {
    test(`${platform} buffered image: ${scenario}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, PLATFORM: platform, SCENARIO: scenario },
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
