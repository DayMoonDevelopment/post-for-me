// Local-only: bundle with Bun and run the output with Node 22; see WEBHOOK_SIZING.md.
// Uses the real task handlers, Supabase client and retry.fetch, but no external services.
import assert from "node:assert/strict";
import {
  resourceCatalog,
  type TaskMetadataWithFunctions,
} from "@trigger.dev/core/v3";
import { logger, tags, tasks } from "@trigger.dev/sdk";

const definitions = new Map<string, TaskMetadataWithFunctions>();
resourceCatalog.registerTaskMetadata = (definition) => {
  definitions.set(definition.id, definition);
};
// Account for log serialization without printing payloads or retaining logs.
logger.info = logger.error = (_message, properties) => {
  JSON.stringify(properties);
};
tags.add = async () => {};
let batchCount = 0;
tasks.batchTrigger = (async (_id: string, items: unknown[]) => {
  batchCount = JSON.parse(JSON.stringify(items)).length;
  return { batchId: "local-only" };
}) as typeof tasks.batchTrigger;

process.env.SUPABASE_URL = "https://database.example";
process.env.SUPABASE_SERVICE_ROLE_KEY = "local-only";
const mode = process.argv[2] ?? "fanout";
const count = Number(process.argv[3] ?? 25);
const dataBytes = Number(process.argv[4] ?? 4096);
const responseBytes = Number(process.argv[5] ?? 1024);
const eventData = {
  id: "post-id",
  caption: "x".repeat(dataBytes),
  media: [{ url: "https://media.example/video.mp4" }],
};
let insertedCount = 0;
let deliveredCount = 0;
let savedStatus: string | undefined;
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: {
      "content-type": "application/json",
      "content-range": `0-${count - 1}/${count}`,
    },
  });
globalThis.fetch = (async (input, init) => {
  const request = new Request(input, init);
  // Include asynchronous I/O, but not real service latency, in local wall time.
  await new Promise((resolve) => setTimeout(resolve, 2));
  if (request.url.startsWith("https://customer.example")) {
    deliveredCount++;
    assert.deepEqual(JSON.parse(await request.text()).data, eventData);
    return new Response(
      new ReadableStream({
        start(controller) {
          for (
            let remaining = responseBytes;
            remaining > 0;
            remaining -= 65536
          ) {
            controller.enqueue(
              new Uint8Array(Math.min(remaining, 65536)).fill(120),
            );
          }
          controller.close();
        },
      }),
    );
  }
  assert.equal(request.url.startsWith("https://database.example/"), true);
  if (request.method === "GET") {
    return json(
      Array.from({ length: count }, (_, i) => ({
        id: `webhook-${i}`,
        project_id: "project-id",
        url: "https://customer.example/hook",
        secret_key: "secret",
        webhook_subscribed_event_types: [{ type: "social.post.updated" }],
      })),
    );
  }
  if (request.method === "POST") {
    const events = await request.json();
    insertedCount = events.length;
    return json(
      events.map((event: object, i: number) => ({
        ...event,
        id: `event-${i}`,
        webhooks: {
          url: "https://customer.example/hook",
          secret_key: "secret",
        },
      })),
    );
  }
  assert.equal(request.method, "PATCH");
  const update = await request.json();
  savedStatus = update.status;
  assert.equal(update.response.body.length, responseBytes);
  return new Response(null, { status: 204 });
}) as typeof fetch;

async function main() {
  await import("../process-webhooks");
  await import("../process-webhook-event");
  const definition = definitions.get(
    mode === "fanout" ? "process-webhooks" : "process-webhook-event",
  )!;
  const cpu = process.cpuUsage();
  const start = performance.now();
  await definition.fns.run(
    mode === "fanout"
      ? {
          projectId: "project-id",
          eventType: "social.post.updated",
          eventData,
        }
      : {
          id: "event-id",
          webhookId: "webhook-id",
          url: "https://customer.example/hook",
          secret: "secret",
          type: "social.post.updated",
          data: eventData,
        },
    {} as never,
  );
  if (mode === "fanout") {
    assert.equal(insertedCount, count);
    assert.equal(batchCount, count);
  } else {
    assert.equal(deliveredCount, 1);
    assert.equal(savedStatus, "completed");
  }
  const used = process.cpuUsage(cpu);
  console.log(
    JSON.stringify({
      node: process.version,
      mode,
      count,
      dataBytes,
      responseBytes,
      wallMs: Math.round(performance.now() - start),
      cpuMs: Math.round((used.user + used.system) / 1000),
      peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024),
    }),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
