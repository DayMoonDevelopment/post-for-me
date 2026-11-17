export const platformAudioControllerDescription = `
Discover audio for a connected social account in the authenticated project.
This endpoint lists audio; it does not download audio or attach it to a post.

## Supported connections

- **Instagram**, connected through **Facebook Login**. Instagram Login is not supported.
- **TikTok Business**, for popular tracks from the Commercial Music Library.

Regular TikTok and other platforms are not supported as they do not provide audio endpoints.


Example Instagram query:

    ?platform_configurations[instagram][audio_type]=music&platform_configurations[instagram][search_query]=birthday

Example TikTok Business query:

    ?platform_configurations[tiktok_business][country_code]=US&platform_configurations[tiktok_business][date_range]=7DAY&platform_configurations[tiktok_business][genre]=ALL

URL-encode bracket notation and filter values when constructing requests.
Keyword search is **Instagram-only**. Unknown fields, nulls, arrays, and
configurations for other providers are rejected. Neither provider supports
limit, offset, or cursor parameters on this endpoint.

## Response

Results contain **data** (the audio list) and **meta**:

- **count** is the returned list length, not an upstream total.
- **has_more** is always false and **next** is always null. Pagination is not supported.
- No matches returns an empty data array and count of 0.
- TikTok Business returns up to 100 tracks.

Each track includes **provider**, **id**, provider-specific **platform_data**, and
optional **title**, **duration_ms**, **artist**, **preview_url**, and **artwork_url**.
Unavailable shared metadata is omitted; provider-native fields may be null.
Shared duration_ms is a positive integer in **milliseconds**. Unknown or zero
durations are omitted. Native TikTok track and clip durations remain in **seconds**.
Preview URLs may be unavailable; Instagram download URLs expire after approximately 1.5 days.

## Audio IDs

All IDs are opaque **strings**. Never convert them to numbers.

- **Instagram**: id is platform_data.audio_id, the audio selection ID.
- **TikTok Business**: id is platform_data.commercial_music_id, a discovery track ID,
  **not a publishable sound clip ID**. Select song_clip_id from
  platform_data.full_duration_song_clip or platform_data.trending_song_clip for
  music_sound_info.music_sound_id. Either clip may be missing or null; never fall
  back to commercial_music_id when a clip is unavailable.

Discovery does not itself guarantee that an audio selection can be published for
every media type or connection.

## Errors

- **400**: Invalid filters, mismatched provider configuration, unsupported platform,
  or Instagram account connected through Instagram Login.
- **401**: Missing or invalid API key.
- **404**: Account does not exist or does not belong to the authenticated project.
- **500**: Account lookup or refreshed credential persistence failed.
- **502**: Provider request failed or returned an invalid response.

The API refreshes account credentials when needed. Provider HTTP exceptions may
retain their status; raw provider errors and account credentials are not exposed.
`;
