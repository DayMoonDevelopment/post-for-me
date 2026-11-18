# Live Zenith Media Processing

## Percentage rollout

Set `ZENITH_MEDIA_PERCENTAGE` in each Trigger environment (a number from `0` to
`100`, including fractional percentages). **The default is `0`: all production
media processing uses the legacy Trigger tasks.** Missing, non-numeric, negative,
or greater-than-100 values also use `0`. Set `100` to use Zenith wherever supported.

`media-processing-backend.ts` hashes the post ID into a stable bucket. Selection
is approximate, not a traffic quota. Raising the percentage expands the cohort;
retries select the same backend while the percentage is unchanged. `process-post`
resolves once and propagates `mediaProcessingBackend: "trigger" | "zenith"` on
every medium, including account overrides, stories, and supplied image covers.
Child tasks always honor this explicit choice, even if the percentage changes.
Direct `post-to-platform` runs resolve missing choices using the post ID too.

Every individual processing entry point also resolves missing choices using its
media ID (when available), otherwise its source URL. This includes
`process-post-medium`, `process-live-medium`, `transform-live-image`, the three
legacy image-transform tasks, `ffmpeg-process-video`, `ffmpeg-compress-video`,
`probe-video-dimensions`, and `upload-bluesky-video`. Direct calls therefore
participate in the rollout without requiring a `process-post` parent. Existing
payloads remain valid. Use the explicit backend field to pin an individual call;
for medium-based payloads, put it on `medium`. Legacy workers and animation
fallback calls are explicitly pinned to Trigger to prevent routing loops.

Uploads, compatibility copies, and manual
shadow diagnostics retain their existing behavior; shadow diagnostics do not
participate in the production percentage rollout.

At `0`, no production path needs Zenith/Redis configuration. R2, Sharp, and
FFmpeg remain required for the legacy cohort and the capability exceptions.
The following publishing graph describes the **Zenith-selected** cohort; the
Trigger cohort localizes with `process-post-medium`, normalizes videos with
`ffmpeg-process-video`, and uses the existing native image and Bluesky tasks.

`MEDIA_SERVER_REDIS_URL` is **required** for Zenith-selected operations. Configure it in
each Trigger environment using the Redis instance and logical database consumed
by Zenith (`redis://` or `rediss://`). Missing configuration fails selected processing;
there is no legacy-pipeline fallback. Trigger needs no Zenith database or bucket
credentials. R2 credentials remain necessary for the legacy cohort and exceptions below.

`process-post` no longer schedules `media-shadow`. The old diagnostic task remains
available for manual diagnostics only; its results are never used for publishing.
Already queued or running shadow tasks are not cancelled by this change.

## Publishing graph

1. `process-post` batches `process-live-medium` child runs. Each localizes its main
   medium and any supplied thumbnail using `media.localize`. Optional thumbnail
   localization failures retain the supplied URL, as before.
2. Non-skipped videos are normalized with `media.transform-video`, production's
   `accept` checks, a 300 MiB `maxBytes`, and the H.264 recipe. All three decisions
   (`unchanged`, `copied`, `encoded`) propagate the completed output's URL, stored
   file/version, content type, and metadata. Skipped media is still localized and
   profiled, but not transformed.
3. Account/platform/default overrides and merged configuration select media in
   persisted index order. Failed main media stops accounts selecting it; unrelated
   account branches continue. A failed override never silently selects defaults.
   Stories retain sequential posting, and provider item limits remain unchanged.
4. Platform clients call `transform-live-image` for Instagram images and single
   video covers, TikTok/TikTok Business images, and X/Bluesky image preparation.
   Stored references (including thumbnail references) avoid re-localization.
   Instagram's completed first-image dimensions anchor subsequent carousel crops.
   Image quality ladders chain each completed version into the next job.
5. `upload-bluesky-video` uses stored metadata instead of an FFmpeg dimension
   probe. Oversized non-skipped videos get up to three chained Zenith compression
   passes. The uploader consumes the final output exactly once; it does not run
   generic normalization again. Provider uploads, Supabase-domain compatibility
   copies, publishing, and status polling remain Trigger tasks.

Recipes and stored-media types live in `media-recipes.ts`; `live-media.ts`
contains the injectable production executor and transformation helpers.
`media-server.ts` owns the vendored transport and response validation contracts.
No cross-sibling or Zenith source imports are used.

## Waitpoints, failures, and secrets

Each Zenith job creates a Trigger waitpoint token, then enqueues one interop job
on BullMQ's `trigger-interop` queue (`bull` prefix):

| Real task | Interop job |
| -- | -- |
| `media.localize` | `media.trigger-localize` |
| `media.transform-image` | `media.trigger-transform-image` |
| `media.transform-video` | `media.trigger-transform-video` |
| `media.extract-video-frame` | `media.trigger-extract-video-frame` |

Input is `{ input, callback: { url } }`, with the real task's input and callback
URL. Zenith completes the token with `{ ok: true, output }` or
`{ ok: false, error: { code, message } }`. Every successful response is validated
before use. Invalid envelopes/results, worker failures, failed enqueues, and
token timeouts fail the child; they never count as processed media.

Token timeouts cover queue wait plus execution: 30 minutes for video transforms,
10 minutes otherwise. Waiting time does not consume the child's 600-second
compute budget. Enqueue has three bounded attempts with the same deterministic
run/stage/medium ID and callback. Child run IDs isolate account destinations.
BullMQ has five worker attempts with exponential backoff and three-hour job
retention. Redis operations have 2.5-second timeouts and close their connections.

**No overlapping Trigger waits:** localization children run concurrently via
`batchTriggerAndWait`. Inside each child, token waits are sequential. Destination
image processing uses separate child runs; the parent awaits each child before
provider polling or another child wait. Animated fallback waits begin only after
the Zenith token has settled. This also avoids overlapping token waits with
`wait.for`, `triggerAndWait`, or other waits in the same run.

Requests and completed outputs log run/stage/medium/job IDs and stored versions.
`sanitizeMediaServerLog` redacts URLs, including callback and Redis secrets.
Transport exceptions are not logged verbatim. Timeout does not cancel Zenith
work; it may finish after Trigger stops waiting.

## YouTube timestamp thumbnails

Supplied thumbnail URLs keep precedence. For a medium with
`mediaProcessingBackend: "zenith"`, a stored video and `thumbnail_timestamp_ms`,
the YouTube client runs the `extract-live-video-frame` child task, which runs
`media.extract-video-frame` on the stored file/version at that time. The job's
`output` and `maxBytes` state YouTube's limits (JPEG, at most 1280x720, 2 MiB), and
it carries the post's `social_post` lookup key, so the frame is deleted with the
post's other media. The frame's URL goes to `upload-youtube-thumbnail`. The child
run keeps its token wait apart from the client's `triggerAndWait` and processing polls.
A failed extraction is logged and the post goes out without the custom thumbnail;
it never falls back to `generate-youtube-timestamp-thumbnail`, which still serves
the legacy cohort (and a Zenith medium with no stored reference).

## Explicit legacy exceptions

- When a Zenith image transform specifically reports **"Animated images are not
  supported"**, `transform-live-image` invokes the existing platform-specific
  legacy image task, explicitly pinned to Trigger. It then localizes that output
  to recover real
  stored references and metadata. Other failures never select legacy tasks.
  Localization metadata has no page count, so this is intentionally a targeted
  worker-capability fallback, not an extension-based guess.

Keep Sharp, FFmpeg, their native dependencies, and R2 storage configured for
these exceptions. Legacy localization, video normalization/compression, and
dimension probes are only called by the legacy cohort, not the Zenith publishing flow.

## Deployment and retained artifacts

Deploy Zenith's three real lanes (`ingest`, `images`, `videos`) and
`trigger-interop` before increasing the percentage above zero. Verify migrations,
storage, Redis capacity/`noeviction`, source URL reachability and host allowlists.
Run a staging publish covering image/carousel, video, supplied cover, skipped
media, animation, and YouTube timestamp thumbnails before sustained traffic.

Artifacts use `publishing/<child-run-ID>/<request-ID>` with Zenith-resolved
extensions. After all account and story publishing finishes and the post's
`processed` status is saved, Zenith-selected posts enqueue
`media.trigger-delete-social-post-files` directly on `trigger-interop` with
`{ socialPostId, requestId }`. This also applies to failed/partially successful
posts. Trigger waits only for enqueue confirmation, not deletion; no callback or
waitpoint is created. Enqueue failures are logged without changing posting results.
The worker gets five attempts with exponential backoff. Each processing attempt
uses a new request ID so reprocessed posts can clean up new files.

Deletion removes every file tagged with the post's `social_post` lookup key,
including intermediate transforms and thumbnails, even if another post also uses
the file. It must never be scheduled per account. Legacy Trigger artifacts are
unaffected. Queue retention alone does not delete files. Source URLs must stay
accessible for queueing/retries.

Native versions and encoding may differ between backends. Zenith image
recipes flatten transparency to black. X's no-auto-orientation conversion keeps
Zenith's orientation tag (legacy Sharp stripped metadata). Generic video accepts
good streams in MP4, copies other containers to MP4, and rejects outputs over
300 MiB. Large videos without usable duration fail compression explicitly.
Image ladders and Bluesky's three passes retain the existing return-anyway
behavior if the final artifact remains oversized; provider validation still applies.
