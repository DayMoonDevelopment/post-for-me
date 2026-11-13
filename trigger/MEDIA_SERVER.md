# Live Zenith Media Processing

`MEDIA_SERVER_REDIS_URL` is **required** for posts with media. Configure it in
each Trigger environment using the Redis instance and logical database consumed
by Zenith (`redis://` or `rediss://`). Missing configuration fails processing;
there is no legacy-pipeline fallback. Trigger needs no Zenith database or bucket
credentials. R2 credentials remain necessary for the two legacy exceptions below.

`process-post` no longer schedules `media-shadow`. The old diagnostic task remains
available for manual diagnostics only; its results are never used for publishing.

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

## Explicit legacy exceptions

- YouTube timestamp-thumbnail generation remains
  `generate-youtube-timestamp-thumbnail` (FFmpeg). Supplied thumbnails retain
  precedence and optional-thumbnail failures retain existing behavior.
- When a Zenith image transform specifically reports **"Animated images are not
  supported"**, `transform-live-image` invokes the existing platform-specific
  legacy image task. It then localizes that completed output to recover real
  stored references and metadata. Other failures never select legacy tasks.
  Localization metadata has no page count, so this is intentionally a targeted
  worker-capability fallback, not an extension-based guess.

Keep Sharp, FFmpeg, their native dependencies, and R2 storage configured for
these exceptions. Legacy localization, video normalization/compression, and
dimension probes are no longer called by the publishing flow.

## Deployment and retained artifacts

Deploy Zenith's three real lanes (`ingest`, `images`, `videos`) and
`trigger-interop` before deploying this Trigger release. Verify migrations,
storage, Redis capacity/`noeviction`, source URL reachability and host allowlists.
Run a staging publish covering image/carousel, video, supplied cover, skipped
media, animation, and YouTube timestamp thumbnails before sustained traffic.

Artifacts use `publishing/<child-run-ID>/<request-ID>` with Zenith-resolved
extensions. No artifact deletion is performed; queue retention does not delete
files. Source URLs must stay accessible for queueing/retries.

Native versions and encoding may differ from the retired pipeline. Image
recipes flatten transparency to black. X's no-auto-orientation conversion keeps
Zenith's orientation tag (legacy Sharp stripped metadata). Generic video accepts
good streams in MP4, copies other containers to MP4, and rejects outputs over
300 MiB. Large videos without usable duration fail compression explicitly.
Image ladders and Bluesky's three passes retain the existing return-anyway
behavior if the final artifact remains oversized; provider validation still applies.
