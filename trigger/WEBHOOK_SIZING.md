# Webhook task sizing (PFME-180)

## Decision

- `process-webhooks`: reduce **medium-1x → small-2x** (1 vCPU, 1 GiB).
  Smaller profiled workloads fit small-1x, but high fanout exceeded its 512 MiB
  budget locally. Small-2x retains the existing CPU allocation with half the RAM.
- `process-webhook-event`: retain **medium-1x** (1 vCPU, 2 GiB).
  It buffers arbitrary customer response bodies and serializes them back to the
  database. Local stress cases leave insufficient headroom on either small preset.

No payloads, queries, delivery headers, timeouts, retries, idempotency keys,
status updates, concurrency settings, or maximum durations change. In particular,
no additional OOM replay is introduced: retrying after an external side effect
can duplicate deliveries or fanout inserts.

## Code and history review

Both tasks have explicitly selected medium-1x since their introduction in
`8f3b07f` (August 2025). The reviewed history contains no CPU/memory justification
or earlier OOM incident explaining that selection. The standalone move in
`627857c` preserved it; later delivery-error handling and awaited batch triggering
do not introduce CPU-heavy processing.

### Fanout (`process-webhooks.ts`)

1. Fetch matching project subscriptions, including URLs, secrets and event types.
2. Map each subscription to an event row referencing the incoming JSON data.
3. Insert all rows and read the returned JSON plus delivery URL and secret.
4. Map those rows to a Trigger batch and await submission, not delivery.

The producers in `api/src/social-posts/social-posts.controller.ts`,
`api/src/social-provider-connections/social-provider-connections.controller.ts`,
`trigger/process-post.ts`, and `trigger/post-to-platform.ts` supply JSON post,
account and result metadata: captions, configurations, media **URLs**, IDs,
provider details and errors. The tasks do not download the referenced media,
decode images, run FFmpeg, or perform encryption/compression. The main work is
network I/O plus JSON allocation/serialization, not sustained computation.

Memory grows with subscription count × serialized event size. The initial
`events` array shares the data object, but JSON serialization and returned
database rows duplicate it. There is no application-level subscription limit or
pagination here. Local Supabase config has `max_rows = 1000`; this is **not**
proof of the production setting or a guaranteed application bound. The profile's
1,000-subscriber cases are stress scenarios, not measured production fanout.

### Delivery (`process-webhook-event.ts`)

One run delivers one JSON event. It tags the run, awaits `retry.fetch`, reads the
entire final response with `.text()`, and persists status and response details.
There is no in-run parallel delivery. A one-second fetch timeout and eight
status/timeout attempts do not impose a response-byte limit. Body reading and
database serialization can simultaneously retain multiple copies of the body;
the status log also includes it on HTTP errors. Retaining medium is warranted
by actual local allocation evidence, not by the webhook payload alone.

Neither task defines a queue/concurrency override. Fanout creates separate child
runs rather than loading all responses into its own process. Account/environment
concurrency and external service latency were unavailable locally and remain
unchanged. `maxDuration: 3600` is a ceiling, not evidence of an hour of CPU use.

## Reproducible local profile

Run **inside `trigger/`**:

```sh
bun install --frozen-lockfile
bun build scripts/profile-webhooks.ts --target node --format esm --outfile .trigger/webhook-profile.mjs
# Use Node 22, matching trigger.config.ts. If node isn't installed, the
# node-linux-x64 package supplies a Linux x64 binary without changing package.json.
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs fanout 25 4096
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs fanout 1000 4096
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs fanout 100 65536
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs fanout 1000 65536
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs delivery 1 4096 1024
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs delivery 1 65536 16777216
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs delivery 1 65536 67108864
bun x --package node-linux-x64@22 node .trigger/webhook-profile.mjs delivery 1 65536 134217728
```

The script captures registered **real handlers** using the pinned SDK's resource
catalog. It uses the real Supabase client and `retry.fetch`, replaces network
access with synthetic JSON/streamed responses and 2 ms delays, and models log
and batch serialization without sending anything. Assertions check fanout row
and batch counts, delivered JSON, and the persisted completed status/body.
Each command is a fresh Node process. `peakRssMiB` uses process high-water RSS,
including imports and fixture allocation; CPU and wall time cover the handler.
Those timings also include fixture generation and simulated service work.
`trigger.config.ts` explicitly excludes the profiler from task discovery while
preserving the default test/spec exclusions; it must never execute in a worker.

Initial measurements on Linux x64, Node 22.23.5 (not CPU/memory constrained):

| Run      | Subscribers | Caption bytes | Response bytes | Wall ms | CPU ms | Peak RSS MiB |
| -------- | ----------: | ------------: | -------------: | ------: | -----: | -----------: |
| Fanout   |          25 |         4,096 |              — |      24 |     14 |           84 |
| Fanout   |       1,000 |         4,096 |              — |     255 |    201 |          135 |
| Fanout   |         100 |        65,536 |              — |     307 |    251 |          173 |
| Fanout   |       1,000 |        65,536 |              — |   2,705 |  2,463 |          639 |
| Delivery |           1 |         4,096 |          1,024 |      33 |     27 |           85 |
| Delivery |           1 |        65,536 |     16,777,216 |     475 |    369 |          244 |
| Delivery |           1 |        65,536 |     67,108,864 |   1,894 |  1,574 |          535 |
| Delivery |           1 |        65,536 |    134,217,728 |   4,030 |  2,967 |          917 |

These inputs are illustrative/stress fixtures, not observed payload percentiles.
Fixture generation can overestimate task-only allocation, while the absence of
the cloud supervisor, tracing, IPC and real network buffers can underestimate
whole-machine usage. This is not a cloud capacity guarantee or a latency
benchmark. Small-2x leaves roughly 385 MiB above the largest profiled fanout;
small-1x cannot fit that case. Delivery at 128 MiB leaves only about 107 MiB on
small-2x before cloud overhead, so it remains medium. Neither medium nor small
can guarantee handling an unlimited payload/response.

## Validation and rollout

- `bun run typecheck`, `bun run lint`, `bun test` (from `trigger/`).
- `webhook-tasks.test.ts` locks machine choices and existing duration/retry
  settings. It exercises fanout filters/inserts/payloads/idempotency/awaited
  batches, empty results and failures; delivery headers, retry policy, terminal
  statuses, body-read/network failures and database-update errors.
- No production runs were triggered and no deployment is performed by profiling.
- After deployment, compare fanout peak memory, duration, OOMs, retries, queue
  delay and missing/duplicate events across normal and high-fanout projects.
  Restore fanout to medium-1x if memory approaches 1 GiB or reliability regresses.
  Local evidence supports the reduction but cannot replace that observation.
- Before considering delivery on small, separately bound/stream response capture
  with an explicit truncation contract, then validate it. Before fanout on
  small-1x, bound/chunk batches and validate large-event/high-subscription cases.
  Those behavior changes are intentionally outside this issue.

Machine specs: <https://trigger.dev/docs/machines> (reviewed November 12, 2026).
