# R2 Media Storage

Trigger writes localized media, thumbnails, processed videos, Bluesky-compressed
videos, and Instagram/TikTok transformed images to R2. Existing Supabase and
external URLs remain readable over HTTP. Supabase is still required for database
access. The API upload endpoint and dashboard uploads have not been migrated.

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

## Before Production

- Attach a public custom domain to the R2 bucket. Do not use the S3 API endpoint
  as the public media URL.
- Grant the credentials object-write and multipart-upload permissions, including
  aborting multipart uploads.
- Verify public GET, HEAD, Content-Length, Content-Type, and byte-range responses.
  Do not require cookies or authentication or present bot challenges to providers.
- Verify the new public domain/URL prefix for every applicable TikTok app before
  switching photo publishing. Standard TikTok photos use `PULL_FROM_URL`; standard
  videos still upload bytes. TikTok Business also passes media URLs to TikTok.
- The current dashboard TikTok setup displays the Supabase prefix and uploads
  verification files to Supabase. It does not verify the R2 domain. Arrange R2
  verification-file hosting and app verification separately; a new domain is not
  automatically covered by existing app verification. Update that onboarding
  flow before relying on it to configure new apps for R2.
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
