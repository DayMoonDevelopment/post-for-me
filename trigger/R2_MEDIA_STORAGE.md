# R2 Media Storage

Optional Zenith media-server shadow traffic is documented in [MEDIA_SERVER.md](./MEDIA_SERVER.md).

Trigger writes localized media, thumbnails, processed videos, Bluesky-compressed
videos, and Instagram/TikTok transformed images to R2. Existing Supabase and
external URLs remain readable over HTTP. Supabase is still required for database
access. The API upload endpoint and dashboard uploads have not been migrated.

Standard TikTok posts for projects with `is_system = false` copy the final media
from R2 back into Supabase's `post-media` bucket via `copy-media-to-supabase`.
Photos are copied after TikTok-specific transformations (or after skipping them),
so TikTok receives the legacy public URL. Videos also use the copied Supabase
source before their existing byte-upload flow. System standard TikTok projects
do not run this copy task.

TikTok Business photos also copy their final URLs to Supabase for all projects,
including when `skip_processing` is set. This is a temporary workaround for
`PROCESSING_DOWNLOAD` stalls after the R2 switch (PFM-1626), not a confirmed
root-cause fix. The copy happens after transformation, and a failed copy stops
publication rather than submitting the R2 URL. Business videos and their
thumbnail URLs are unchanged. Remove this exception once live TikTok Business
photo pulls from R2 are reliable. Verify photo/carousel publishing in staging
using the legacy public prefix below; do not automatically repost timed-out
publish IDs, since they may still complete on TikTok.

Facebook video Stories and Reels also copy their media to Supabase before
creating the Meta upload session, as a temporary workaround for robots-policy
rejections by Meta's URL fetchers. This applies to all projects. Facebook photos,
photo Stories, regular video posts, and other platforms continue using R2.
If the Facebook copy fails or cannot be triggered, publishing proceeds with the
original R2 URL and logs a warning. White-label TikTok copy failures still fail
the account's post to preserve its verified-domain requirement.

## Environment

Configure these locally and in every deployed Trigger.dev environment:

| Variable | Value |
| --- | --- |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Bucket-scoped S3 access key |
| `R2_SECRET_ACCESS_KEY` | Bucket-scoped S3 secret key |
| `R2_BUCKET_NAME` | Destination bucket, e.g. `post-media` |
| `R2_PUBLIC_BASE_URL` | Public bucket-root URL, e.g. `https://media.example.com` |

The region is `auto`. The public URL must not contain credentials, a query, or a
fragment. A path prefix is supported only if public routing maps it to the bucket
root; the uploader does not add that prefix to object keys. Keep
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured.

The copy task defaults to `${SUPABASE_URL}/storage/v1/object/public/post-media`
for public URLs. If the API URL differs from the legacy domain verified by
white-label TikTok apps, set the optional `SUPABASE_MEDIA_PUBLIC_BASE_URL` to
`https://data.postforme.dev/storage/v1/object/public/post-media` (or the existing
verified bucket prefix). This changes only the returned URL, not the upload
destination; that public host must serve the same Supabase bucket. The existing
Supabase cleanup task removes these temporary copies under its current policy.

## Before Production

- Attach a public custom domain to the R2 bucket. Do not use the S3 API endpoint
  as the public media URL.
- Grant the credentials object-write and multipart-upload permissions, including
  aborting multipart uploads.
- Verify public GET, HEAD, Content-Length, Content-Type, and byte-range responses.
  Do not require cookies or authentication or present bot challenges to providers.
- Verify the R2 public domain/URL prefix for system TikTok apps and applicable
  TikTok Business apps. Standard TikTok photos use `PULL_FROM_URL`; standard
  videos still upload bytes. TikTok Business also passes media URLs to TikTok.
- The current dashboard TikTok setup displays the Supabase prefix and uploads
  verification files to Supabase. Non-system standard TikTok projects retain
  that verified prefix through the copy task and do not need R2 verification.
  Ensure the copy task's public prefix matches their existing verification.
- Configure lifecycle cleanup for abandoned multipart uploads after crashes or
  terminated tasks. Handled upload failures abort their multipart uploads.
- Leave completed objects available for scheduled posts and delayed provider
  fetches. The existing Supabase cleanup task does not delete R2 objects, so R2
  object retention/cleanup remains a separate follow-up. Do not apply blanket
  object expiration without accounting for scheduled posts.
- Keep legacy Supabase URLs accessible for existing scheduled and in-flight jobs,
  subject to the unchanged Supabase cleanup task's retention behavior.

No historical media backfill or database schema migration is required. Validate
real-provider publishing in staging before production; local tests exercise the
S3 protocol and platform payloads but do not validate live R2 credentials or
provider domain verification.
