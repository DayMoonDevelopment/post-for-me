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
   on `ingest`. Observe each job to terminal state and validate its response.
2. Normalize non-skipped videos that need processing using
   `media.transform-video` on `videos`. Compliant videos are not encoded.
3. Resolve account/platform/default media overrides using the live selection
   helper, merge destination configuration, and split story posting units.
4. Run required platform transformations: Instagram images and single-video
   covers, TikTok/TikTok Business images, oversized X/Bluesky images, and
   oversized single-video Bluesky posts. Preserve carousel anchoring, item caps,
   ordering, and skip rules. Other platforms have no additional media recipe.
5. Finish only after every submitted job is confirmed completed/failed, or the
   coordinator's observation deadline expires. Independent jobs continue after
   another branch fails. Stage boundaries follow the normal post flow.

Each transform reads `source: { fileId, versionId }` from the preceding
completed job, never the live pipeline's URL. Localization metadata is sufficient
to select recipes without downloading or running Sharp/FFmpeg in the coordinator.
Image quality ladders and Bluesky's three video passes are separate chained jobs.
Oversized final outputs are logged, matching the live ladders' return-anyway
behavior rather than passing Zenith's rejecting `maxBytes` option.

Contracts are vendored locally from Zenith's
`packages/foundations/src/jobs/catalogue.ts` (reviewed at `186cd76`). BullMQ is
6.3.11, ioredis is 6.0.0, and the queue prefix is `bull`. Job requests contain
only catalogue fields; post/stage/account context stays in Trigger logs.

## Timing And Timeouts

The task has `maxDuration: 7200` and no automatic Trigger retries. A separate
wall-clock observation deadline expires after 7,170 seconds, reserving 30
seconds for bounded Redis operations and final logs before the hard cutoff.
Each Redis operation has a 2.5-second deadline. At most five Redis operations
run concurrently; observing one slow job does not block independent submissions.
Connections close before checkpoint-capable polling waits (normally 10 seconds).

Requests and terminal responses are logged with post/run/stage/medium/account
context, job ID, queue, path, and request ID. URLs are redacted in requests,
responses, and worker failure reasons. Transport exceptions are not logged
verbatim because they may expose Redis credentials. Logs include:

- Timeline labels name the Zenith task, destination platform, and stage, for
  example `media.transform-image [instagram/image-q100]`. Request details include
  `redisJob: { name, data, options }`, built by the same function used for
  `queue.add(name, data, options)`, including the full transform recipe and stored
  source IDs. Source URLs remain redacted.
- Client elapsed time from submission through observation.
- Zenith enqueue-to-terminal time, including retries and queue delays.
- Latest-attempt duration and attempts made; this is not cumulative compute
  time across all worker retries.
- Per-stage and total coordinator wall time. Polling adds up to approximately
  one polling interval per dependent job. Trigger scheduling delay is excluded.
- A final completed/failed/incomplete count, unsupported-capability count,
  unsubmitted-stage count, incomplete job IDs, and retained artifact IDs.

On deadline, every unconfirmed submitted job is logged individually as
**incomplete**, with its ID, queue, stage, last observed state, and elapsed time.
No further dependent jobs are submitted. The task fails after its final summary;
a timeout is never reported as successful completion. An unexpected hard kill
can prevent final logs, so job IDs are also logged before each enqueue.

An enqueue acknowledgement failure is ambiguous. The coordinator observes the
known ID and retries the same request/ID if Redis confirms the job is missing.
Confirmed enqueues that later disappear remain incomplete, not successful.
IDs are deterministic within a coordinator run; a new post-processing run
creates a new shadow sample. Worker jobs have five attempts with exponential
backoff starting at one second. Completed/failed jobs are retained for three
hours without a count cap so high traffic does not evict unobserved responses;
budget Redis memory accordingly and use `noeviction`.

Timeout does not cancel Zenith work. Jobs may continue running after Trigger
stops observing them. Missing/unreachable jobs can keep the coordinator open
until its deadline.

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
- Unknown video metadata is handled conservatively and can force an encode
  where live processing would pass through. Oversized videos without a usable
  duration cannot have a safe bitrate budget calculated and fail that branch.
- X's no-auto-orientation JPEG conversion is not exact metadata parity:
  Zenith preserves the orientation tag when `autoOrient: false`, whereas the
  live Sharp conversion strips metadata. Tagged oversized images can therefore
  display differently; Zenith needs an explicit strip-without-rotate option
  for exact parity on that path.
- Zenith `accept` does not express all live video checks (including audio
  channels/sample rate). The coordinator makes eligibility decisions itself
  and omits `accept`, avoiding accidental copy/pass-through decisions.
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
