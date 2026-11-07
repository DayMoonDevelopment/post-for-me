# Media Server Shadow Traffic

Set `MEDIA_SERVER_REDIS_URL` locally or in the intended Trigger.dev cloud
environment to enqueue shadow traffic into Zenith's media server. Leave it unset
to disable shadow traffic. Use `redis://` or `rediss://` pointing to the same
Redis instance and logical database as Zenith's workers. No database or bucket
credentials for Zenith are needed by this producer.

The helper uses BullMQ 6.3.11, ioredis 6.0.0, prefix `bull`, and these contracts
from `post-for-me-zenith/packages/foundations/src/jobs/catalogue.ts`:

| Trigger Task | Zenith Job | Queue |
| --- | --- | --- |
| `process-post-medium` (main URL and supplied thumbnail) | `media.localize` | `ingest` |
| `ffmpeg-process-video` | `media.transform-video` | `videos` |
| `transform-instagram-image` | `media.transform-image` | `images` |
| `transform-tiktok-image` (both TikTok variants) | `media.transform-image` | `images` |
| `transform-buffered-image` (Twitter and Bluesky) | `media.transform-image` | `images` |

All existing processing, uploads, and publishing results remain authoritative.
Only enqueue acknowledgement is awaited, with a 2.5-second overall deadline per
call. Main/thumbnail localization enqueues run concurrently. Redis failures are
logged and ignored. Connections are closed after enqueue; there is no completion
polling, output validation, result substitution, or completion callback.

## Recipes

Transforms reuse the dimensions, crop, orientation, frame rate, preset, bitrate,
and audio decisions already calculated by each task. Compliant videos still
enqueue an H.264/AAC shadow encode using their probed dimensions/frame rate and
the usual encoder defaults before the original task returns early. Odd video
dimensions are rounded down to even for Zenith's schema without changing the
live FFmpeg recipe. Failures before recipe calculation do not enqueue transforms.

This is workload testing, not an output-equivalence test. Zenith accepts a single
image encoding recipe, not the existing multi-pass JPEG compression ladder.
Image quality follows the final quality selected by the existing compression
branch, but Zenith encodes directly from the source rather than recompressing
intermediate JPEGs. Buffered copy/skip paths use representative encodes in their source
PNG/JPEG/WebP format; other formats fall back to JPEG. Animated formats are not
supported by Zenith. `maxBytes` is a final acceptance check, not an instruction
to iteratively compress. Some shadow jobs may therefore fail even when live
processing succeeds. There are no extra downloads, probes, or encoding passes
on the Trigger side for shadow traffic.

## Observability And Cleanup

Logs distinguish calls, acknowledged enqueues, and enqueue failures. They include
the originating task, queue, job ID, request ID, and destination path, without
source URLs or Redis credentials. An acknowledged enqueue does not mean the
worker has started or completed. On timeout, the enqueue outcome can be unknown.
Use BullMQ worker-side timestamps (`timestamp`, `processedOn`, `finishedOn`) and
Zenith logs to inspect queue latency and processing time separately. This helper
does not collect those metrics.

Jobs use Zenith's defaults: five attempts with exponential backoff starting at
one second, retaining the last 1,000 completed and 5,000 failed jobs per queue.
Every call gets a unique request ID; Trigger retries create additional samples.
No sample-rate limit is applied.

Artifacts are written under `shadow/<UTC-date>/<originating-task>/<UUID>` in
Zenith's configured bucket, not the live processing destination. Localization
paths are extensionless; content type is determined by Zenith from the bytes.
Zenith also creates `storage.file` rows for successful jobs.

**Artifacts have no automatic expiry.** Arrange manual cleanup after the test:
inspect retained jobs' results and enqueue `media.delete` on `ingest` with
`{ fileId }` (or `{ url }` for a known public artifact URL). Do not delete bucket
objects alone and leave their storage records behind. Queue result retention
is count-based and can roll over quickly under load, so plan cleanup before a
sustained capacity run. Stopping shadow traffic does not cancel queued jobs or
delete existing artifacts.

Zenith needs healthy workers for all three lanes, migrated storage tables,
working object storage, and a Redis `noeviction` policy. Source URLs must remain
reachable from its workers for queue wait and retry duration. Local/private
source hosts require Zenith's explicit allowlist. Verify connectivity and a
small sample in the target environment before enabling a full load test.
