# Media Server Shadow Coordinator

Set `MEDIA_SERVER_REDIS_URL` in the intended Trigger environment to enable
shadow processing. Leave it unset to disable it. Use the Redis instance and
logical database used by Zenith's workers (`redis://` or `rediss://`). Trigger
does not need Zenith database or bucket credentials.

`process-post` schedules one detached `media-shadow` task before live
localization. Scheduling acknowledgement is awaited; shadow processing is not.
Shadow failures never change live processing, uploads, or publishing results.
Account credentials, API keys, captions, and app secrets are not forwarded.
The former individual-task shadow producers have been removed.

## Processing Graph

1. Localize every original medium and supplied thumbnail using `media.localize`
   through the interop lane (see Waitpoint Flow). Validate each response.
2. Submit every non-skipped localized video as a `media.transform-video` job with production's checks as `accept`, `maxBytes` of 300 MiB, and
   production's H.264 encode as `output`. The coordinator does not decide
   eligibility: Zenith profiles the source and returns a `decision` of
   `unchanged` (the source passed; the result names the source's own file and
   version), `copied` (video stream kept, audio or container redone) or
   `encoded`. Decisions are logged per video and counted in the final summary
   as `videoDecisions`. Downstream stages read the result's file and version
   the same way for all three.
3. Resolve account/platform/default media overrides using the live selection
   helper, merge destination configuration, and split story posting units.
4. Run required platform transformations: Instagram images and single-video
   covers, TikTok/TikTok Business images, oversized X/Bluesky images, and
   oversized single-video Bluesky posts. Preserve carousel anchoring, item caps,
   ordering, and skip rules. Other platforms have no additional media recipe.
5. Finish only after every submitted job's token has completed (succeeded or
   failed) or timed out. Independent jobs continue after another branch fails. Stage boundaries follow the normal post flow.

Each transform reads `source: { fileId, versionId }` from the preceding
completed job, never the live pipeline's URL. Localization metadata is sufficient
to select recipes without downloading or running Sharp/FFmpeg in the coordinator.
Image quality ladders and Bluesky's three video passes are separate chained jobs.
Oversized final outputs of the image ladders and Bluesky's passes are logged,
matching the live ladders' return-anyway behavior rather than passing Zenith's
rejecting `maxBytes` option; only the generic video transform sends `maxBytes`.

Contracts are vendored locally from Zenith's
`packages/foundations/src/jobs/catalogue.ts` (reviewed at `186cd76`). BullMQ is
6.3.11, ioredis is 6.0.0, and the queue prefix is `bull`. Job requests contain
only catalogue fields; post/stage/account context stays in Trigger logs.

## Waitpoint Flow

Per Zenith job the coordinator:

1. Creates a Trigger waitpoint token with `wait.createToken({ timeout, tags,
   idempotencyKey })`. The timeout covers queue wait plus the run: 30 minutes
   for `media.transform-video`, 10 minutes for localize and image jobs
   (`SHADOW_VIDEO_TOKEN_TIMEOUT`, `SHADOW_TOKEN_TIMEOUT`). The idempotency key is
   the deterministic job ID, so a retried coordinator reuses its token. Tags are
   the post ID and the Trigger run ID.
2. Adds one job to the `trigger-interop` BullMQ queue (same Redis, `bull`
   prefix, five attempts with exponential backoff, three-hour retention) under
   the same deterministic job ID:

   | Real task | Interop job name |
   | -- | -- |
   | `media.localize` | `media.trigger-localize` |
   | `media.transform-video` | `media.trigger-transform-video` |
   | `media.transform-image` | `media.trigger-transform-image` |

   Data is `{ input, callback: { url } }`. `input` is exactly what the real task
   takes (source, output, accept, maxBytes, `requestId`, `path`); `url` is the
   token's callback URL.
3. Waits with `wait.forToken(token)`. Media runs the real task and POSTs
   `{ ok: true, output }` (the real task's output, validated by
   `parseMediaServerResponse`) or `{ ok: false, error: { code, message } }` to
   the callback. `ok: false` records the branch as failed; a timed-out token is
   recorded as **incomplete**.

The callback URL is a secret. It is never logged: `sanitizeMediaServerLog`
redacts every URL and any `callback` entry whole.

A failed enqueue (Redis refusing the add) is retried three times with the same
job ID, which BullMQ deduplicates. If all fail, the branch fails and its token
is left to time out.

### Parallel Waits

Trigger rejects overlapping waits: `wait.forToken` goes through the same guard
as `wait.for` and `triggerAndWait` and throws "Parallel waits are not supported,
e.g. using Promise.all() around our wait functions"
([troubleshooting](https://trigger.dev/docs/troubleshooting#parallel-waits-are-not-supported)).
There is no batch wait for tokens (`batchTriggerAndWait` exists only for child
runs). So tokens are created and jobs enqueued concurrently, as before, and
the coordinator queues the waits: branches call `forToken` one at a time, in
the order they asked. Jobs still run in parallel on media's side and tokens
complete independently; a wait on an already-completed token returns at once.
The cost is head-of-line blocking: a branch whose token completed early
continues only after the waits ahead of it resume, so a slow job delays the
dependents of faster ones that were queued behind it. Measured client times
therefore include that; Zenith's own timings come from media.

## Timing And Timeouts

The task has `maxDuration: 600` and no automatic Trigger retries.
`maxDuration` is compared with CPU time, which excludes time waiting on tokens
([docs](https://trigger.dev/docs/runs/max-duration#how-it-works)), so it bounds
only the enqueue, token and logging work, not how long Zenith takes. The
coordinator has no wall-clock deadline and does not poll; a job is bounded by
its token timeout. Each Redis operation has a 2.5-second deadline and at most
five run concurrently. Connections are opened per operation and closed after.

Requests and terminal responses are logged with post/run/stage/medium/account
context, job ID, queue, path, request ID and token ID. URLs are redacted in
requests, responses and worker failure messages. Transport exceptions are not
logged verbatim because they may expose Redis credentials. Logs include:

- Timeline labels name the Zenith task, destination platform, and stage, for
  example `media.transform-image [instagram/image-q100]`. Request details include
  `redisJob: { name, data, options }`, built by the same function used for
  `queue.add(name, data, options)`, including the full transform recipe and stored
  source IDs. Source URLs and the callback are redacted.
- Client elapsed time from token creation through the token's result.
- Per-stage and total coordinator wall time. Trigger scheduling delay is excluded.
- A final completed/failed/incomplete count, unsupported-capability count,
  incomplete job IDs, `videoDecisions`, and retained artifact IDs.

Every job whose token timed out is logged as **incomplete** with its ID, stage
and elapsed time, and its dependents are not submitted. The task fails after its
final summary; a timeout is never reported as successful completion.

IDs are deterministic within a coordinator run; a new post-processing run
creates a new shadow sample. Completed/failed jobs are retained for three
hours without a count cap; budget Redis memory accordingly and use `noeviction`.

Timeout does not cancel Zenith work. Jobs may continue running after Trigger
stops waiting for them.

## Compatibility Gaps

- Zenith has no video-frame/thumbnail extraction task. YouTube timestamp-based
  thumbnail requests produce an explicit unsupported warning/count. Supplied
  thumbnails are localized; supported cover transformations are measured.
- Zenith rejects animated-image transformations. Such worker failures are
  logged as failed and explicitly counted as unsupported. Localization metadata
  does not expose page count, so they cannot reliably be rejected beforehand.
- Byte-identical output is not guaranteed. Zenith uses normalized display
  dimensions (including pixel aspect ratio), average FPS metadata, and potentially
  different native tool versions. Instagram's raw EXIF dimension choice is
  reconstructed; JPEG recipes specify black transparency flattening to match
  the existing Sharp pipelines rather than Zenith's white default.
- Oversized videos without a usable duration cannot have a safe bitrate budget calculated and fail that branch.
- X's no-auto-orientation JPEG conversion is not exact metadata parity:
  Zenith preserves the orientation tag when `autoOrient: false`, whereas the
  live Sharp conversion strips metadata. Tagged oversized images can therefore
  display differently; Zenith needs an explicit strip-without-rotate option
  for exact parity on that path.
- The generic video `accept` expresses every check production makes, and
  Zenith decides the path. Three differences from live production are accepted:
  a `.mov` with good streams comes out `copied` into an MP4, where production
  would skip it; an encoded result over 300 MiB fails the job, where production
  only gates the source; and pixel format is not checked, as in production.
  Bluesky's size-budget encodes send no `accept`.
- Supabase-domain compatibility copies, platform uploads, provider-side
  transcoding, and publishing/status polling are outside this measurement.
  Destinations are planned from post configuration, not credential validation
  or provider API responses, so live failures can prevent work that shadow
  would otherwise perform.

## Retained Artifacts

Files are stored under `shadow/<Trigger-run-ID>/<request-ID>`, with extensions
resolved by Zenith. **No artifact deletion is performed.** Cleanup is handled
separately. Per-job responses and the final manifest identify stored files and
immutable versions. Queue retention removes job records, not files.

Use Zenith's `media.delete` job on `ingest` with `{ fileId }` for later cleanup;
do not delete bucket objects alone. Deleting a file removes all its versions.
Source URLs must remain accessible to Zenith for queueing/retry duration.
Local/private hosts require Zenith's explicit allowlist. Verify healthy workers
for all three lanes, migrated storage tables, object storage, and a small sample
in the intended environment before enabling sustained traffic.
