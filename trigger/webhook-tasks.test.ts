import { expect, test } from "bun:test";

test("task discovery excludes the local profiler and tests, not webhook tasks", () => {
  const result = Bun.spawnSync(
    [
      process.execPath,
      "--eval",
      String.raw`
        import { expect } from "bun:test";
        const { default: config } = await import("./trigger.config.ts");
        const ignored = (path) => config.ignorePatterns.some((pattern) => new Bun.Glob(pattern).match(path));
        for (const path of ["scripts/profile-webhooks.ts", "webhook-tasks.test.ts", "posting/example.spec.mjs"]) expect(ignored(path)).toBe(true);
        for (const path of ["process-webhooks.ts", "process-webhook-event.ts"]) expect(ignored(path)).toBe(false);
      `,
    ],
    { cwd: __dirname, env: process.env },
  );
  expect(result.exitCode, result.stderr.toString()).toBe(0);
});

// Isolate module mocks from the other task suites.
const harness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.SCENARIO;
const calls = [];
const data = { id: "post", caption: "caption", media: [{ url: "https://media.example/video" }] };
const webhook = { id: "webhook", url: "https://customer.example", secret_key: "secret" };
const event = { id: "event", webhook_id: webhook.id, type: "social.post.updated", data, webhooks: webhook };
const dbError = new Error("database failed");
const query = {
  select: (...args) => { calls.push(["select", ...args]); return query; },
  eq: (...args) => { calls.push(["eq", ...args]); return query; },
  in: (...args) => { calls.push(["in", ...args]); return query; },
  insert: (rows) => { calls.push(["insert", rows]); return query; },
  update: (row) => { calls.push(["update", row]); return query; },
  then: (resolve) => {
    if (calls.some(([name]) => name === "update")) return Promise.resolve({ error: scenario === "update-error" ? dbError : null }).then(resolve);
    if (calls.some(([name]) => name === "insert")) return Promise.resolve({ error: scenario === "insert-error" ? dbError : null, data: scenario === "missing-events" ? null : [event] }).then(resolve);
    return Promise.resolve({ error: scenario === "query-error" ? dbError : null, count: scenario === "empty" ? 0 : 1, data: scenario === "empty" ? [] : [webhook] }).then(resolve);
  },
};
mock.module("@supabase/supabase-js", () => ({ createClient: () => ({ from: (table) => { calls.push(["from", table]); return query; } }) }));
const errorLog = mock(() => {});
const fetch = mock(async () => {
  if (scenario === "network-error") throw new Error("network failed");
  return { ok: scenario !== "http-error", status: scenario === "http-error" ? 503 : 200, statusText: "response", text: async () => {
    if (scenario === "body-error") throw new Error("body failed");
    return "customer response";
  } };
});
let batchFinished = false;
const batchTrigger = mock(async () => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  if (scenario === "batch-error") throw new Error("batch failed");
  batchFinished = true;
  return { batchId: "batch" };
});
const addTags = mock(async () => {});
mock.module("@trigger.dev/sdk", () => ({ task: (definition) => definition, logger: { info: () => {}, error: errorLog }, tasks: { batchTrigger }, retry: { fetch }, tags: { add: addTags } }));
const { processWebhooks: fanout } = await import("./process-webhooks.ts");
const { processWebhooks: delivery } = await import("./process-webhook-event.ts");
expect(fanout.machine).toBe("small-2x");
expect(delivery.machine).toBe("medium-1x");
expect(fanout.maxDuration).toBe(3600);
expect(delivery.maxDuration).toBe(3600);
expect(fanout.retry).toEqual({ maxAttempts: 3 });
expect(delivery.retry).toEqual({ maxAttempts: 2 });
if (process.env.TASK === "fanout") {
  const run = () => fanout.run({ projectId: scenario === "invalid" ? "" : "project", eventType: "social.post.updated", eventData: data });
  if (["invalid", "query-error", "insert-error", "missing-events", "batch-error"].includes(scenario)) {
    await expect(run()).rejects.toThrow(scenario === "invalid" ? "Invalid Request" : scenario === "query-error" ? "database failed" : scenario === "batch-error" ? "batch failed" : "Unable to add events");
    expect(batchFinished).toBe(false);
  } else {
    await run();
    if (scenario === "empty") {
      expect(batchTrigger).not.toHaveBeenCalled();
      expect(calls.some(([name]) => name === "insert")).toBe(false);
    } else {
      expect(batchFinished).toBe(true);
      expect(calls).toContainEqual(["eq", "project_id", "project"]);
      expect(calls).toContainEqual(["in", "webhook_subscribed_event_types.type", ["social.post.updated"]]);
      expect(calls).toContainEqual(["insert", [{ webhook_id: "webhook", type: "social.post.updated", data, status: "processing" }]]);
      expect(batchTrigger).toHaveBeenCalledWith("process-webhook-event", [{ payload: {
        id: "event", webhookId: "webhook", url: webhook.url, type: event.type, data, secret: webhook.secret_key,
      }, options: { idempotencyKey: "process-webhook-event:event", idempotencyKeyTTL: "1h" } }]);
    }
  }
} else {
  await delivery.run({ id: "event", webhookId: "webhook", url: webhook.url, type: event.type, data, secret: webhook.secret_key });
  expect(addTags).toHaveBeenCalledWith(["webhook", "event"]);
  expect(fetch).toHaveBeenCalledWith(webhook.url, {
    method: "POST", headers: { "Content-Type": "application/json", "Post-For-Me-Webhook-Secret": "secret" },
    body: JSON.stringify({ event_type: event.type, data }), timeoutInMs: 1000,
    retry: { byStatus: { "300-599": { strategy: "backoff", maxAttempts: 8, factor: 2, minTimeoutInMs: 500, maxTimeoutInMs: 1000, randomize: false } }, timeout: { maxAttempts: 8, factor: 2, minTimeoutInMs: 500, maxTimeoutInMs: 1000, randomize: false } },
  });
  const update = calls.find(([name]) => name === "update")[1];
  expect(update.status).toBe(["http-error", "network-error"].includes(scenario) ? "failed" : "completed");
  expect(Number.isNaN(Date.parse(update.updated_at))).toBe(false);
  expect(calls).toContainEqual(["eq", "id", "event"]);
  if (scenario === "network-error") expect(update.response).toEqual({ error: "network failed" });
  else expect(update.response.response).toEqual({ status: scenario === "http-error" ? 503 : 200, statusText: "response", ...(scenario === "body-error" ? {} : { body: "customer response" }) });
  if (scenario === "update-error") expect(errorLog).toHaveBeenCalledWith("Failed to update webhook event", expect.objectContaining({ error: dbError }));
}
`;

for (const [task, scenarios] of Object.entries({
  fanout: [
    "success",
    "empty",
    "invalid",
    "query-error",
    "insert-error",
    "missing-events",
    "batch-error",
  ],
  delivery: [
    "success",
    "http-error",
    "network-error",
    "body-error",
    "update-error",
  ],
})) {
  for (const scenario of scenarios) {
    test(`webhook ${task}: ${scenario}`, () => {
      const result = Bun.spawnSync([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, TASK: task, SCENARIO: scenario },
      });
      expect(result.exitCode, result.stderr.toString()).toBe(0);
    });
  }
}
