import { expect, test } from "bun:test";

// Module mocks live only in subprocesses, so other task suites keep their own SDK mocks.
const harness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.MEDIA_SERVER_SCENARIO;
const redisUrl = "redis://fake-user:fake-redis-password@127.0.0.1:1/7";
const source = "https://source.example/media?signature=fake-signed-url-secret";
process.env.MEDIA_SERVER_REDIS_URL = redisUrl;
const logs = [];
mock.module("@trigger.dev/sdk", () => ({ logger: {
  info: (...args) => logs.push(["info", ...args]),
  warn: (...args) => logs.push(["warn", ...args]),
} }));
const connections = [], queues = [], adds = [], events = [];
const timers = new Map();
const cleared = [];
let nextTimer = 0, clock = 0;
const virtual = scenario.startsWith("timeout-");
if (virtual) {
  globalThis.setTimeout = (callback, delay) => {
    const id = ++nextTimer;
    timers.set(id, { callback, delay, at: clock + delay });
    return id;
  };
  globalThis.clearTimeout = (id) => { cleared.push(id); timers.delete(id); };
}
let resolveConnect, resolveAdd;
const connectGate = new Promise((resolve) => { resolveConnect = resolve; });
const addGate = new Promise((resolve) => { resolveAdd = resolve; });
const failure = new Error("Redis " + redisUrl + " source " + source);
failure.name = "TestEnqueueError";
const forbidden = mock(() => { throw new Error("Must not inspect job completion"); });
mock.module("ioredis", () => ({ Redis: class {
  constructor(url, options) {
    this.url = url; this.options = options;
    this.on = mock(() => this);
    this.disconnect = mock(() => { events.push("disconnect"); });
    this.quit = forbidden;
    connections.push(this);
  }
  async connect() {
    events.push("connect");
    if (scenario === "connect-rejection") throw failure;
    if (scenario === "non-error-rejection") throw source;
    if (scenario === "timeout-connect" || scenario === "timeout-overall") await connectGate;
  }
} }));
mock.module("bullmq", () => ({
  QueueEvents: forbidden,
  Worker: forbidden,
  Queue: class {
    constructor(name, options) {
      this.name = name; this.options = options;
      this.on = mock(() => this);
      this.close = mock(async () => {
        events.push("close");
        // Cleanup rejection must not turn a shadow failure into a task failure.
        if (scenario === "add-rejection") throw failure;
      });
      this.getJob = forbidden;
      this.getJobState = forbidden;
      this.getJobs = forbidden;
      this.waitUntilReady = forbidden;
      queues.push(this);
    }
    async add(...args) {
      adds.push(args); events.push("add");
      if (scenario === "add-rejection") throw failure;
      if (scenario === "acknowledgement" || scenario === "timeout-add" || scenario === "timeout-overall") await addGate;
      events.push("acknowledged");
      return { waitUntilFinished: forbidden, getState: forbidden, returnvalue: undefined };
    }
  },
}));
const { enqueueMediaServerJob } = await import("./media-server.ts");
const origin = "process-post-medium";
const localize = { task: "media.localize", url: source };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const warnings = () => logs.filter(([level]) => level === "warn");
const successes = () => logs.filter(([, message]) => message === "Media server shadow job enqueued");

if (scenario === "disabled") {
  for (const value of [undefined, ""]) {
    if (value === undefined) delete process.env.MEDIA_SERVER_REDIS_URL;
    else process.env.MEDIA_SERVER_REDIS_URL = value;
    expect(await enqueueMediaServerJob(origin, localize)).toBeUndefined();
  }
  expect(connections).toHaveLength(0);
  expect(queues).toHaveLength(0);
  expect(logs).toHaveLength(0);
} else if (scenario === "routing") {
  const image = { type: "image", format: "jpeg", quality: 80, autoOrient: true,
    resize: { width: 1080, height: 1920, fit: "cover", withoutEnlargement: false } };
  const video = { type: "video", container: "mp4", faststart: true,
    video: { codec: "h264", preset: "ultrafast", profile: "high", level: "4.0", pixelFormat: "yuv420p",
      crf: 23, bitrate: 2000000, maxrate: 3000000, bufsize: 6000000, scale: { width: 1080, height: 1920 }, fps: 30 },
    audio: { codec: "aac", bitrate: 128000, channels: 2, sampleRate: 48000 } };
  const cases = [
    [origin, localize, "ingest", "media-localize", ""],
    ["transform-instagram-image", { task: "media.transform-image", source, output: image, maxBytes: 10000000 }, "images", "media-transform-image", ".jpg"],
    ["transform-buffered-image", { task: "media.transform-image", source, output: { type: "image", format: "png" } }, "images", "media-transform-image", ".png"],
    ["transform-tiktok-image", { task: "media.transform-image", source, output: { ...image, format: "webp" } }, "images", "media-transform-image", ".webp"],
    ["ffmpeg-process-video", { task: "media.transform-video", source, output: video, maxBytes: 50000000 }, "videos", "media-transform-video", ".mp4"],
    ["ffmpeg-process-video", { task: "media.transform-video", source, output: { ...video, audio: null } }, "videos", "media-transform-video", ".mp4"],
  ];
  for (const [taskOrigin, job, lane, prefix, extension] of cases) {
    const beforeDate = new Date().toISOString().slice(0, 10);
    expect(await enqueueMediaServerJob(taskOrigin, job)).toBeUndefined();
    const afterDate = new Date().toISOString().slice(0, 10);
    const [name, payload, options] = adds.at(-1);
    expect(name).toBe(job.task);
    expect(payload.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect([beforeDate, afterDate]).toContain(payload.path.split("/")[1]);
    expect(payload.path).toBe("shadow/" + payload.path.split("/")[1] + "/" + taskOrigin + "/" + payload.requestId + extension);
    const { task, ...input } = job;
    expect(payload).toEqual({ ...input, requestId: payload.requestId, path: payload.path });
    expect(options).toEqual({ jobId: prefix + "/" + payload.requestId, attempts: 5,
      backoff: { type: "exponential", delay: 1000 }, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } });
    expect(queues.at(-1).name).toBe(lane);
    expect(queues.at(-1).options).toEqual({ connection: connections.at(-1), prefix: "bull" });
    const context = { origin: taskOrigin, task, queue: lane, jobId: options.jobId, requestId: payload.requestId, path: payload.path };
    expect(logs.slice(-2)).toEqual([
      ["info", "Calling media server shadow job", context],
      ["info", "Media server shadow job enqueued", context],
    ]);
  }
  // Retries of the exact same input must not deduplicate shadow samples.
  await Promise.all(Array.from({ length: 8 }, () => enqueueMediaServerJob(origin, localize)));
  for (const values of [adds.map(([, p]) => p.requestId), adds.map(([, p]) => p.path), adds.map(([, , o]) => o.jobId)]) {
    expect(new Set(values).size).toBe(adds.length);
  }
  expect(warnings()).toHaveLength(0);
} else if (scenario === "acknowledgement") {
  let settled = false;
  const pending = enqueueMediaServerJob(origin, localize).then(() => { settled = true; });
  await flush();
  expect(adds).toHaveLength(1);
  expect(settled).toBe(false);
  expect(successes()).toHaveLength(0);
  expect(connections[0].disconnect).not.toHaveBeenCalled();
  resolveAdd();
  await pending;
  expect(successes()).toHaveLength(1);
  expect(events).toEqual(["connect", "add", "acknowledged", "disconnect", "close"]);
} else {
  const pending = enqueueMediaServerJob(origin, localize);
  await flush();
  if (virtual) {
    expect(timers.size).toBe(1);
    const [id, timer] = [...timers][0];
    expect(timer.delay).toBe(2500);
    expect(successes()).toHaveLength(0);
    if (scenario === "timeout-overall") {
      clock = 2000;
      resolveConnect();
      await flush();
      expect(adds).toHaveLength(1);
      expect([...timers.keys()]).toEqual([id]);
      expect(timer.at - clock).toBe(500);
    }
    clock = 2500;
    timer.callback();
    await expect(pending).resolves.toBeUndefined();
    expect(cleared).toEqual([id]);
    expect(timers.size).toBe(0);
    expect(warnings()[0][2].errorType).toBe("Error");
  } else {
    await expect(pending).resolves.toBeUndefined();
    expect(warnings()[0][2].errorType).toBe(scenario === "non-error-rejection" ? "UnknownError" : "TestEnqueueError");
  }
  expect(successes()).toHaveLength(0);
  expect(warnings()).toHaveLength(1);
  expect(warnings()[0][1]).toBe("Media server shadow enqueue failed; continuing existing processing");
  expect(adds).toHaveLength(scenario === "add-rejection" || scenario === "timeout-add" || scenario === "timeout-overall" ? 1 : 0);
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
for (const queue of queues) {
  expect(queue.on).toHaveBeenCalledWith("error", expect.any(Function));
  expect(queue.close).toHaveBeenCalledTimes(1);
}
expect(forbidden).not.toHaveBeenCalled();
const serialized = JSON.stringify(logs);
for (const secret of [redisUrl, "fake-user", "fake-redis-password", source, "fake-signed-url-secret"]) {
  expect(serialized).not.toContain(secret);
}
`;

const networkHarness = String.raw`
import { expect, mock } from "bun:test";
import { createServer } from "node:net";
import { Redis as RealRedis } from "ioredis";
const scenario = process.env.MEDIA_SERVER_SCENARIO;
const sockets = new Set();
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
if (scenario === "network-refusal") await new Promise((resolve) => server.close(resolve));
process.env.MEDIA_SERVER_REDIS_URL = "redis://fake-user:fake-redis-password@127.0.0.1:" + port + "/7";
const connections = [], logs = [];
mock.module("@trigger.dev/sdk", () => ({ logger: {
  info: (...args) => logs.push(["info", ...args]), warn: (...args) => logs.push(["warn", ...args]),
} }));
mock.module("ioredis", () => ({ Redis: class extends RealRedis {
  constructor(...args) { super(...args); connections.push(this); }
} }));
try {
  const { enqueueMediaServerJob } = await import("./media-server.ts");
  const start = performance.now();
  await expect(enqueueMediaServerJob("process-post-medium", {
    task: "media.localize", url: "https://source.example/file?signature=fake-signed-url-secret",
  })).resolves.toBeUndefined();
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(3500);
  if (scenario === "network-blackhole") {
    expect(accepted).toBe(1);
    expect(elapsed).toBeGreaterThanOrEqual(2400);
  }
  expect(logs.filter(([level]) => level === "warn")).toHaveLength(1);
  expect(logs.some(([, message]) => message === "Media server shadow job enqueued")).toBe(false);
  // Give ioredis's socket-close handler time to run; there must be no reconnect.
  await Bun.sleep(100);
  expect(connections).toHaveLength(1);
  expect(connections[0].status).toBe("end");
  expect(sockets.size).toBe(0);
  for (const secret of ["fake-user", "fake-redis-password", "fake-signed-url-secret"]) {
    expect(JSON.stringify(logs)).not.toContain(secret);
  }
} finally {
  for (const connection of connections) connection.disconnect();
  for (const socket of sockets) socket.destroy();
  if (server.listening) await new Promise((resolve) => server.close(resolve));
}
`;

for (const scenario of [
  "disabled", "routing", "acknowledgement", "connect-rejection", "add-rejection",
  "non-error-rejection", "timeout-connect", "timeout-add", "timeout-overall",
  "network-refusal", "network-blackhole",
]) {
  test(`media server: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", scenario.startsWith("network-") ? networkHarness : harness], {
      cwd: __dirname,
      env: { ...process.env, MEDIA_SERVER_REDIS_URL: "redis://fake-user:fake-redis-password@127.0.0.1:1/7", MEDIA_SERVER_SCENARIO: scenario },
      stdout: "pipe",
      stderr: "pipe",
    });
    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    } finally {
      child.kill();
    }
  }, 5000);
}
