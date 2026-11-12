import { expect, test } from "bun:test";
import {
  parseMediaServerResponse,
  sanitizeMediaServerLog,
  type MediaServerJob,
} from "./media-server";

const image = {
  kind: "image", format: "jpeg", width: 1080, height: 1920,
  orientation: 1, hasAlpha: false,
};
const video = {
  kind: "video", container: "mp4", width: 1080, height: 1920, rotation: 0,
  durationSeconds: 12, bitrate: 2000000, frameRate: 30,
  video: { codec: "h264", profile: "high", pixelFormat: "yuv420p", level: 40, bitrate: 1800000 },
  audio: { codec: "aac", bitrate: 128000, channels: 2, sampleRate: 48000 },
};
const stored = (media: unknown = image) => ({
  fileId: "file-123", versionId: "version-456", path: "shadow/result.jpg",
  url: "https://media.example/result.jpg", contentType: "image/jpeg", size: 1234, media,
});

test("parseMediaServerResponse accepts localized images, videos and documents without copying", () => {
  for (const media of [image, video, { kind: "document", contentType: "application/pdf" }]) {
    const result = stored(media);
    expect<unknown>(parseMediaServerResponse(result, "media.localize")).toBe(result);
  }
  expect(parseMediaServerResponse({ ...stored(), size: 0 }, "media.localize").size).toBe(0);
});

test("parseMediaServerResponse accepts each transform decision and nullable video metadata", () => {
  for (const decision of ["unchanged", "transformed"]) {
    const result = { ...stored(), decision };
    expect<unknown>(parseMediaServerResponse(result, "media.transform-image")).toBe(result);
  }
  for (const decision of ["unchanged", "copied", "encoded"]) {
    for (const rotation of [0, 90, 180, 270]) {
      const result = { ...stored({ ...video, rotation }), decision };
      expect<unknown>(parseMediaServerResponse(result, "media.transform-video")).toBe(result);
    }
  }
  const result = stored({
    ...video, durationSeconds: null, bitrate: null, frameRate: null,
    video: { codec: "h264", profile: null, pixelFormat: null, level: null, bitrate: null },
    audio: null,
  });
  expect<unknown>(parseMediaServerResponse(result, "media.localize")).toBe(result);
  const nullableAudio = stored({
    ...video, audio: { codec: "aac", bitrate: null, channels: null, sampleRate: null },
  });
  expect<unknown>(parseMediaServerResponse(nullableAudio, "media.localize")).toBe(nullableAudio);
});

test("parseMediaServerResponse rejects invalid stored media envelopes", () => {
  for (const value of [null, undefined, [], "result", 1]) {
    expect(() => parseMediaServerResponse(value, "media.localize")).toThrow("Invalid Zenith result object");
  }
  for (const key of ["fileId", "versionId", "path", "url", "contentType"]) {
    for (const value of [undefined, null, "", 1]) {
      expect(() => parseMediaServerResponse({ ...stored(), [key]: value }, "media.localize"))
        .toThrow("Invalid Zenith stored media result");
    }
  }
  for (const size of [undefined, null, "12", -1, 1.5, NaN, Infinity]) {
    expect(() => parseMediaServerResponse({ ...stored(), size }, "media.localize"))
      .toThrow("Invalid Zenith stored media result");
  }
  for (const media of [undefined, null, [], {}, { kind: "audio" }, { kind: "document", contentType: "" }]) {
    expect(() => parseMediaServerResponse({ ...stored(), media }, "media.localize")).toThrow();
  }
});

test("parseMediaServerResponse rejects malformed image metadata", () => {
  for (const patch of [
    { format: "" }, { width: 0 }, { width: Infinity }, { height: -1 }, { height: "1920" },
    { orientation: 0 }, { orientation: 9 }, { orientation: 1.5 }, { hasAlpha: undefined }, { hasAlpha: 0 },
  ]) {
    expect(() => parseMediaServerResponse(stored({ ...image, ...patch }), "media.localize"))
      .toThrow("Invalid Zenith image metadata");
  }
  for (const orientation of [1, 8]) {
    expect<unknown>(parseMediaServerResponse(stored({ ...image, orientation }), "media.localize").media)
      .toEqual({ ...image, orientation });
  }
});

test("parseMediaServerResponse rejects malformed video and audio metadata", () => {
  for (const patch of [
    { container: "" }, { width: 0 }, { height: NaN }, { rotation: 45 },
    { durationSeconds: undefined }, { bitrate: Infinity }, { frameRate: "30" },
    ...["codec", "profile", "pixelFormat", "level", "bitrate"].map((key) => ({
      video: { ...video.video, [key]: key === "codec" || key === "profile" || key === "pixelFormat" ? "" : NaN },
    })),
  ]) {
    expect(() => parseMediaServerResponse(stored({ ...video, ...patch }), "media.localize"))
      .toThrow("Invalid Zenith video metadata");
  }
  for (const audio of [
    { ...video.audio, codec: "" }, { ...video.audio, bitrate: NaN },
    { ...video.audio, channels: "2" }, { ...video.audio, sampleRate: undefined },
  ]) {
    expect(() => parseMediaServerResponse(stored({ ...video, audio }), "media.localize"))
      .toThrow("Invalid Zenith audio metadata");
  }
  for (const patch of [{ video: null }, { video: [] }, { audio: undefined }, { audio: [] }]) {
    expect(() => parseMediaServerResponse(stored({ ...video, ...patch }), "media.localize"))
      .toThrow("Invalid Zenith result object");
  }
});

test("parseMediaServerResponse requires task-specific media kinds and decisions", () => {
  const cases: [MediaServerJob["task"], unknown, unknown][] = [
    ["media.transform-image", image, undefined], ["media.transform-image", image, "encoded"],
    ["media.transform-video", video, undefined], ["media.transform-video", video, "transformed"],
    ["media.transform-image", video, "unchanged"], ["media.transform-video", image, "unchanged"],
    ["media.transform-image", { kind: "document", contentType: "application/pdf" }, "unchanged"],
  ];
  for (const [task, media, decision] of cases) {
    expect(() => parseMediaServerResponse({ ...stored(media), decision }, task))
      .toThrow("Invalid Zenith transform decision");
  }
});

test("sanitizeMediaServerLog recursively redacts URLs without mutating input", () => {
  const value = {
    message: 'GET HTTPS://source.example/file?signature=secret failed; redis://user:password@host:6379/7',
    nested: [null, true, 42, undefined, { error: 'rediss://user:secret@host/0 "http://example.test/file"' }],
  };
  expect(sanitizeMediaServerLog(value)).toEqual({
    message: "GET [redacted URL] failed; [redacted URL]",
    nested: [null, true, 42, undefined, { error: '[redacted URL] "[redacted URL]"' }],
  });
  expect(value.message).toContain("signature=secret");
  expect(value.nested[4]).toEqual({ error: 'rediss://user:secret@host/0 "http://example.test/file"' });
});

test("sanitizeMediaServerLog redacts a callback entry whole, whatever it holds", () => {
  expect(sanitizeMediaServerLog({ data: { callback: { url: "https://trigger.example/callback/secret" } }, callback: "opaque-secret" }))
    .toEqual({ data: { callback: "[redacted callback]" }, callback: "[redacted callback]" });
});

test("sanitizeMediaServerLog bounds each string after redaction and preserves plain values", () => {
  expect(sanitizeMediaServerLog("https://secret.example/" + "x".repeat(5000))).toBe("[redacted URL]");
  expect(sanitizeMediaServerLog(["a".repeat(5000), { text: "b".repeat(5000) }]))
    .toEqual(["a".repeat(4000), { text: "b".repeat(4000) }]);
  for (const value of [undefined, null, false, 0, "plain text"]) {
    expect(sanitizeMediaServerLog(value)).toBe(value);
  }
});

// Module mocks live only in subprocesses, so other suites keep their own mocks.
const harness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.MEDIA_SERVER_SCENARIO;
const connections = [], queues = [], adds = [], events = [];
const failure = new Error("Redis operation failed");
const redisUrl = "redis://user:password@127.0.0.1:1/7";
const forbidden = mock(() => { throw new Error("Unexpected long-lived Redis operation"); });
let resolveAdd;
const addGate = new Promise((resolve) => { resolveAdd = resolve; });
mock.module("ioredis", () => ({ Redis: class {
  constructor(url, options) {
    this.url = url; this.options = options;
    this.on = mock(() => this);
    this.disconnect = mock(() => events.push("disconnect"));
    this.quit = forbidden;
    connections.push(this);
  }
  async connect() {
    events.push("connect");
    if (scenario === "connect-error") throw failure;
  }
} }));
mock.module("bullmq", () => ({
  QueueEvents: forbidden, Worker: forbidden,
  Queue: class {
    constructor(name, options) {
      this.name = name; this.options = options;
      this.on = mock(() => this);
      this.close = mock(async () => {
        events.push("close");
        if (scenario === "add-error") throw new Error("Cleanup failed");
      });
      this.waitUntilReady = forbidden;
      queues.push(this);
    }
    async add(...args) {
      adds.push(args); events.push("add");
      if (scenario === "add-error") throw failure;
      if (scenario === "acknowledgement") await addGate;
      events.push("acknowledged");
      return { waitUntilFinished: forbidden };
    }
  },
}));
const { createMediaServerTransport, MEDIA_SERVER_INTEROP_LANE, mediaServerInteropJobs } = await import("./media-server.ts");
const transport = createMediaServerTransport(redisUrl);
const handle = { jobId: "job-123", queue: "custom-queue", requestId: "request-456", path: "shadow/custom/result" };
const localize = { task: "media.localize", url: "https://source.example/signed?token=secret" };
const callback = { url: "https://trigger.example/callback/secret" };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
if (scenario === "routing") {
  expect(MEDIA_SERVER_INTEROP_LANE).toBe("trigger-interop");
  expect(mediaServerInteropJobs).toEqual({
    "media.localize": "media.trigger-localize",
    "media.transform-image": "media.trigger-transform-image",
    "media.transform-video": "media.trigger-transform-video",
  });
  const source = { fileId: "source-file", versionId: "source-version" };
  const jobs = [localize,
    { task: "media.transform-image", source, output: { type: "image", format: "jpeg", quality: 80,
      autoOrient: true, resize: { width: 1080, height: 1920, fit: "cover", withoutEnlargement: false } } },
    { task: "media.transform-video", source, output: { type: "video", container: "mp4", faststart: true,
      video: { codec: "h264", preset: "fast", crf: 23, scale: { width: 1080, height: 1920 }, fps: 30 },
      audio: { codec: "aac", bitrate: 128000, channels: 2, sampleRate: 48000 } } },
  ];
  for (const job of jobs) {
    const laneHandle = { ...handle, queue: MEDIA_SERVER_INTEROP_LANE };
    const lookupKeys = [{ key: "social_post", refId: "post-1" }];
    expect(await transport.enqueue(laneHandle, job, callback, lookupKeys)).toBeUndefined();
    const { task, ...input } = job;
    expect(adds.at(-1)).toEqual([mediaServerInteropJobs[task], { input: { ...input, requestId: handle.requestId, path: handle.path }, callback, lookupKeys }, {
      jobId: handle.jobId, attempts: 5, backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 10800 }, removeOnFail: { age: 10800 },
    }]);
    expect(queues.at(-1).name).toBe(laneHandle.queue);
  }
  expect(connections).toHaveLength(jobs.length);
  expect(new Set(connections).size).toBe(jobs.length);
} else if (scenario === "acknowledgement") {
  let settled = false;
  const pending = transport.enqueue(handle, localize, callback).then(() => { settled = true; });
  await flush();
  expect(adds).toHaveLength(1);
  expect(settled).toBe(false);
  expect(connections[0].disconnect).not.toHaveBeenCalled();
  resolveAdd();
  await pending;
  expect(events).toEqual(["connect", "add", "acknowledged", "disconnect", "close"]);
} else if (["connect-error", "add-error"].includes(scenario)) {
  await expect(transport.enqueue(handle, localize, callback)).rejects.toBe(failure);
  if (scenario === "connect-error") expect(queues).toHaveLength(0);
}
await flush();
for (const connection of connections) {
  expect(connection.url).toBe(redisUrl);
  const { retryStrategy, ...options } = connection.options;
  expect(options).toEqual({ lazyConnect: true, maxRetriesPerRequest: 0, enableOfflineQueue: false,
    connectTimeout: 2500, commandTimeout: 2500 });
  expect(retryStrategy(1)).toBeNull();
  expect(retryStrategy(100)).toBeNull();
  expect(connection.on).toHaveBeenCalledWith("error", expect.any(Function));
  expect(connection.disconnect).toHaveBeenCalledTimes(1);
}
for (let i = 0; i < queues.length; i++) {
  expect(queues[i].options).toEqual({ connection: connections[i], prefix: "bull" });
  expect(queues[i].on).toHaveBeenCalledWith("error", expect.any(Function));
  expect(queues[i].close).toHaveBeenCalledTimes(1);
}
expect(forbidden).not.toHaveBeenCalled();
`;

const networkHarness = String.raw`
import { expect, mock } from "bun:test";
import { createServer } from "node:net";
import { Redis as RealRedis } from "ioredis";
const sockets = new Set(), connections = [];
let accepted = 0;
const server = createServer((socket) => {
  accepted++;
  sockets.add(socket);
  socket.on("data", () => {});
  socket.on("error", () => {});
  socket.on("close", () => sockets.delete(socket));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
mock.module("ioredis", () => ({ Redis: class extends RealRedis {
  constructor(...args) { super(...args); connections.push(this); }
} }));
try {
  const { createMediaServerTransport } = await import("./media-server.ts");
  const transport = createMediaServerTransport("redis://127.0.0.1:" + port + "/7");
  const handle = { jobId: "job", queue: "ingest", requestId: "request", path: "shadow/result" };
  const start = performance.now();
  const pending = transport.enqueue(handle, { task: "media.localize", url: "https://source.example/file" }, { url: "https://trigger.example/callback" });
  // Either the operation deadline or ioredis's command deadline may win the race.
  await expect(pending).rejects.toThrow(/timed out/i);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(2400);
  expect(elapsed).toBeLessThan(3500);
  expect(accepted).toBe(1);
  await Bun.sleep(100);
  expect(connections).toHaveLength(1);
  expect(connections[0].status).toBe("end");
  expect(sockets.size).toBe(0);
} finally {
  for (const connection of connections) connection.disconnect();
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
}
`;

for (const scenario of [
  "routing", "acknowledgement", "connect-error", "add-error", "blackhole-enqueue",
]) {
  test(`media server transport: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", scenario.startsWith("blackhole-") ? networkHarness : harness], {
      cwd: __dirname,
      env: { ...process.env, MEDIA_SERVER_SCENARIO: scenario },
      stdout: "pipe",
      stderr: "pipe",
    });
    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    } finally {
      child.kill();
    }
  }, 5000);
}
