# Platform audio contracts (PFM-1286)

## Boundary and route

Confirmed with the requester: `GET /v1/platform-audio/:social_account_id`
(feeds-style, not `/v1/:social_account_id/platform-audio`). Listing only; no
write or individual-track endpoint. PFM-1289 adds the authenticated endpoint,
project-scoped account lookup, provider dispatch, refresh, and Swagger registration.
This issue adds contracts, not a live endpoint or provider calls.

Platform-specific discovery filters, response/platform-data DTOs, and publishing
selection DTOs live alongside their services in `api/src/instagram/dto/` and
`api/src/tiktok-business/dto/`. Only the shared base, query wrapper, response
envelope, and service parameter types live in `api/src/lib/dto/`.

Every `SocialPlatformService` requires
`getPlatformAudio({ account, query }): Promise<PlatformAudioResponseDto>`.
All implementations initially reject with `HttpException`, HTTP **400**, and
`Platform audio is not supported for this platform`. TikTok Business discovery
is implemented in PFM-1287; PFM-1288 replaces only the Instagram stub. Regular
TikTok remains unsupported. The endpoint must preserve HttpExceptions,
not mask them as 500s or expose credentials in responses, errors, or metadata.

## Query and validation

Use `PlatformAudioQueryDto` with `PLATFORM_AUDIO_VALIDATION_OPTIONS` in a local
ValidationPipe: transform, whitelist, and forbidNonWhitelisted. The global pipe
alone does not reject unknown filters. Express already uses the extended query
parser. Nested objects, enums, and scalar strings are validated; null, arrays,
unknown provider keys, and unsupported search/pagination parameters are rejected.

Examples (URL-encode bracket notation and enum values in real requests):

```text
/v1/platform-audio/sa_123?platform_configurations[instagram][audio_type]=music&platform_configurations[instagram][search_query]=birthday
/v1/platform-audio/sa_456?platform_configurations[tiktok_business][country_code]=US&platform_configurations[tiktok_business][date_range]=7DAY&platform_configurations[tiktok_business][genre]=FOLK
```

Only the supplied account's provider configuration may be supplied: downstream
dispatch must reject mismatched or multiple provider configurations (400), rather
than silently ignore them. With no configuration, instantiate the matching
provider query DTO to apply defaults. Instagram uses the public `instagram` key
for both connection variants; only Facebook Login is supported.

| Provider        | Filters                                                                                                                                 | Defaults                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Instagram       | `audio_type`: `music` or `original_sound`; optional `search_query`                                                                      | `music` (our explicit default); omit search for trending |
| TikTok Business | `country_code`: uppercase ISO location code; `date_range`: `1DAY`, `7DAY`, `30DAY`, `90DAY`; `genre`: official enum snapshot in the DTO | `US`, `7DAY`, `ALL` (provider defaults)                  |

TikTok has **no documented keyword search**, limit, offset, or cursor here.
Its location reference lists ISO 3166-1 alpha-2 codes; validate syntax/membership
locally, and handle provider-specific regional availability upstream.

## Response, IDs, and duration

Feeds-style envelope: `{ data: PlatformAudio[], meta: { count, has_more: false,
next: null } }`. Count is the returned length, not a claimed upstream total.
Neither referenced discovery endpoint documents pagination for this organic-audio
use case. TikTok returns up to 100 tracks; return that list without truncating it
or manufacturing cursors. Do not borrow Meta's ads-audio pagination semantics.
There is no query `limit` or response `cursor` until upstream support is verified.

Register `PlatformAudioResponseDto`, both concrete audio DTOs, and their nested
platform-data DTOs with Swagger `ApiExtraModels` in PFM-1289 so the `oneOf` references
resolve. Provider-discriminated types keep Instagram and TikTok platform_data distinct.

| Shared field  | Instagram                      | TikTok Business                             |
| ------------- | ------------------------------ | ------------------------------------------- |
| `provider`    | `instagram`                    | `tiktok_business`                           |
| `id`          | `audio_id` (publishable)       | `commercial_music_id` (**not** publishable) |
| `title`       | `title`                        | `commercial_music_name`                     |
| `duration_ms` | `duration_in_ms`               | positive `duration * 1000`                  |
| `artist`      | `display_artist` when supplied | `artist`                                    |
| `preview_url` | `download_url` when supplied   | `preview_url`                               |
| `artwork_url` | `cover_artwork_thumbnail_uri`  | `thumbnail_url`                             |

IDs are opaque strings: never parse them as numbers or lose precision.
Unavailable common metadata is omitted, not replaced by empty strings or fabricated
values. `platformAudioDurationMs` normalizes positive integer durations to milliseconds;
unknown/null/zero/invalid durations are omitted. Preserve provider-native units and
nulls in typed `platform_data`: Instagram `duration_in_ms` is milliseconds; TikTok
track and clip `duration` fields are seconds. TikTok explicitly warns duration 0
can represent a partial track, so do not claim the track is zero-length.

Instagram retains music artwork/artist, original-sound `ig_username` and creator
picture, nullable preview links, and nullable ads eligibility. `download_url`
expires after approximately 1.5 days; on-platform preview links are distinct.
TikTok retains names, genres, string ranks, trending history (nullable daily rank),
and optional/null `full_duration_song_clip` and `trending_song_clip` objects.
Each clip has its own **`song_clip_id`**, seconds duration, and preview URL.
Do not automatically choose a clip or fall back to commercial_music_id if clips
are unavailable. TikTok preview URLs are documented as non-expiring.

TikTok Business discovery checks nonzero response `code` even on HTTP 200 and uses
`account.social_provider_user_id` as `business_id` with the account's access token
in `Access-Token`. It validates the strict query contract and rejects mismatched
provider configurations before requesting. HTTP/network failures, nonzero codes,
and malformed responses return HTTP **502** without exposing credentials or raw
provider errors. Empty/null lists return an empty envelope; absent data/list or
non-string track IDs are invalid responses. Native metadata and both clip objects
are retained, including nulls; no clip is selected or promoted to the shared ID.
PFM-1288 uses Facebook Graph `/ig_audio`, `user_id` from the
account, its access token, and the selected audio filters. Reject Instagram Login
before any discovery request. No caller-supplied tokens or account IDs in filters.

## Publishing field choices (contracts only)

PFM-1290/PFM-1291 own worker types, payload integration, media validation, and
end-to-end tests. These new API DTO fields do **not** yet enable audio publishing.
Existing `audio_name` remains a separate original-audio display name, not selection.

- Instagram: `platform_configurations.instagram.audio_configuration` with required
  string `audio_id`, optional integer `audio_volume` and `video_volume` (0–100;
  provider defaults 100). Put `audio_configuration` alongside `media_type=REELS`
  and `video_url` in the `/media` **container creation** request, not `/media_publish`.
  Facebook Login only; single video Reel only. Reject Stories, photos, carousels,
  and Instagram Login. Meta does not support Reel previews with attached audio.
- TikTok Business: `platform_configurations.tiktok_business.music_sound_info`
  with required string `music_sound_id` (a discovered clip's `song_clip_id`) and
  explicit integer `music_sound_volume` (0–100). Optional `music_sound_start` and
  `music_sound_end` are nonnegative integer **milliseconds**, not seconds;
  end must exceed start and stay within the selected clip's known duration.
  Optional integer `video_original_sound_volume` is 0–100. Map the object into
  **`post_info.music_sound_info`** in `/business/video/publish/`, not top-level or
  directly into post_info. Provider volume defaults are 0; start defaults to 0,
  end to the video duration. Single video only; reject photos, mixed/carousel media,
  drafts, and regular TikTok. With `post_info.upload_to_draft=true`, TikTok says
  all other post_info fields are ignored, so a draft cannot honor this selection.
- `account_configurations[].configuration` exposes the same two objects. An
  account object replaces the entire platform selection object (shallow merge),
  so it must independently supply required fields. Omission inherits the platform
  object; null is not a supported clearing instruction in this contract.

The publishing parent DTOs follow existing documentation-only configuration
patterns; follow-up integration must invoke nested validation, media/connection
checks, and start/end cross-field checks before enqueue/publish. Do not assume the
existing global pipe traverses undocumented parent configuration objects.

## Official sources verified 2026-10-06

- [Instagram Audio API](https://developers.facebook.com/documentation/instagram-platform/content-publishing/audio-api)
- [TikTok popular CML tracks](https://business-api.tiktok.com/portal/docs/get-popular-tracks-from-the-commercial-music-library/v1.3)
  (document 1825119063013505)
- [TikTok video publishing](https://business-api.tiktok.com/portal/docs?id=1762228496095234)
- [TikTok location codes](https://business-api.tiktok.com/portal/docs?id=1737585867307010)

TikTok's portal is client-rendered; verified its official document-content API
`/gateway/api/doc/client/node/get/v2/` with version `1.3`, language `ENGLISH`,
and the above document identifiers. The publishing table labels music_sound_id
as an object, but discovery explicitly documents string song_clip_id values as
accepted by music_sound_id; retain string IDs rather than inventing a nested ID
schema. Meta's listing table labels audio_type as integer despite its string
enum/examples; use the documented music/original_sound strings.
