---
name: add-platform
description: Use when adding a new social media platform to post-for-me. Covers implementing a PostClient subclass in trigger/posting/platforms/, adding a Configuration type to post.types.ts, updating post-client.ts, and documenting options in api/src/social-posts/dto/post-configurations.dto.ts.
---

# Adding a New Social Media Platform

This skill describes exactly how to implement a new posting platform end-to-end.
Follow every step in order.

---

## 1. Files to touch

| File | What changes |
|---|---|
| `trigger/posting/post.types.ts` | Add `<Platform>Configuration` interface and add it to the `PlatformConfiguration` union |
| `trigger/posting/post-client.ts` | Add the new type to the `platformConfig` union in the base `post` signature |
| `trigger/posting/platforms/<platform>-post-client.ts` | New file — the concrete implementation |
| `api/src/social-posts/dto/post-configurations.dto.ts` | Add `<Platform>ConfigurationDto` class, add it to `PlatformConfiguration` union and `PlatformConfigurationsDto`, and add every new field to `AccountConfigurationDetailsDto` |

---

## 2. Add the Configuration type — `post.types.ts`

Add an interface for the platform-level options. Every field must be optional
(users may omit any option). Keep names `snake_case`.

```ts
export interface SnapchatConfiguration {
  caption?: string;
  media?: PostMedia[];
  // platform-specific options…
  placement?: 'spotlight' | 'story';
  allow_resharing?: boolean;
}
```

Then add it to the `PlatformConfiguration` union at the bottom of the file:

```ts
export type PlatformConfiguration =
  | PinterestConfiguration
  | InstagramConfiguration
  // … existing entries …
  | SnapchatConfiguration; // <- append
```

---

## 3. Update the base `post` signature — `post-client.ts`

Add the new type to the `platformConfig` union in the abstract `post` method:

```ts
async post({
  postId,
  account,
  caption,
  media,
  platformConfig,
}: {
  postId: string;
  account: SocialAccount;
  caption: string;
  media: PostMedia[];
  platformConfig:
    | PinterestConfiguration
    // … existing entries …
    | SnapchatConfiguration; // <- append
}): Promise<PostResult> {
```

Also add the import at the top of the file.

---

## 4. Implement the platform client

Create `trigger/posting/platforms/<platform>-post-client.ts`.

### 4a. Class skeleton

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@trigger.dev/sdk/v3";
import { PostClient } from "../post-client";
import {
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
  SnapchatConfiguration, // your new type
} from "../post.types";

export class SnapchatPostClient extends PostClient {
  // ── platform constants ──────────────────────────────────────────────
  readonly #MAX_IMAGES = 10;
  readonly #CHAR_LIMIT  = 250;

  // ── state (reset per call — initialise in constructor or at top of post()) ─
  #requests:  any[] = [];
  #responses: any[] = [];

  // ── credentials ─────────────────────────────────────────────────────
  #clientId:     string;
  #clientSecret: string;

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials,
  ) {
    super(supabaseClient, appCredentials);
    this.#clientId     = appCredentials.app_id;
    this.#clientSecret = appCredentials.app_secret;
  }
```

### 4b. `refreshAccessToken`

Always implement this, even for platforms that don't expire tokens (return a
far-future date in that case). Log the request and response into `#requests` /
`#responses`.

```ts
async refreshAccessToken(account: SocialAccount): Promise<RefreshTokenResult> {
  const url = "https://accounts.snapchat.com/login/oauth2/access_token";

  this.#requests.push({ refreshRequest: url });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: account.refresh_token!,
      client_id:     this.#clientId,
      client_secret: this.#clientSecret,
    }),
  });

  const data = await res.json();
  this.#responses.push({ refreshResponse: data });

  if (!res.ok) {
    throw new Error(`Failed to refresh Snapchat token: ${data.error_description ?? data.error}`);
  }

  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? account.refresh_token,
    expires_at:    new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}
```

### 4c. `post` — top-level method

Keep the `post` method as clean as possible:

- Reset `#requests` / `#responses` at the start (or initialise them as empty
  arrays in the constructor and accept that they accumulate — be consistent with
  the rest of the codebase which initialises them as class fields).
- Delegate media work to `#processVideo`, `#processImages`, etc.
- Keep everything that must happen for every post (caption sanitisation, payload
  assembly, the actual publish call, building the `PostResult`) inside `post`.
- Wrap everything in a `try/catch` that always returns a `PostResult` — never
  throw out of `post`.
- Always include `requests` and `responses` in `details`.

```ts
async post({
  postId,
  account,
  caption,
  media,
  platformConfig,
}: {
  postId: string;
  account: SocialAccount;
  caption: string;
  media: PostMedia[];
  platformConfig: SnapchatConfiguration;
}): Promise<PostResult> {
  try {
    logger.log("Starting Snapchat post", { postId, accountId: account.id });

    const sanitizedCaption = this.#sanitizeCaption(caption);

    // Branch by media type — keep each path in a separate method
    const mediaId =
      media.length === 0      ? null
      : media[0].type === "video" ? await this.#processVideo(media[0], account, platformConfig)
      :                             await this.#processImages(media, account, platformConfig);

    // Build the publish payload (logic that applies regardless of media type)
    const payload = {
      caption:    sanitizedCaption,
      placement:  platformConfig?.placement ?? "story",
      media_id:   mediaId,
      access_token: account.access_token,
    };

    this.#requests.push({ postRequest: payload });

    const res  = await fetch("https://adsapi.snapchat.com/v1/media/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    this.#responses.push({ postResponse: data });

    if (!res.ok) {
      throw new Error(data.error_message ?? `HTTP ${res.status}`);
    }

    const postId_   = data.id as string;
    const postUrl   = `https://www.snapchat.com/p/${postId_}`;

    logger.log("Snapchat post published", { platformPostId: postId_, postUrl });

    return {
      success:               true,
      post_id:               postId,
      provider_connection_id: account.id,
      provider_post_id:      postId_,
      provider_post_url:     postUrl,
      details: {
        requests:  this.#requests,
        responses: this.#responses,
      },
    };
  } catch (error: any) {
    console.error("Error posting to Snapchat:", error);

    return {
      success:               false,
      post_id:               postId,
      provider_connection_id: account.id,
      error_message: this.#humanError(error),
      details: {
        error:     error?.response?.data ?? error?.message ?? error,
        requests:  this.#requests,
        responses: this.#responses,
      },
    };
  }
}
```

### 4d. Media-type helpers

Create separate private methods for each media type. Prefix them with `#`.

```ts
async #processVideo(
  medium: PostMedia,
  account: SocialAccount,
  config: SnapchatConfiguration,
): Promise<string> {
  logger.log("Uploading video to Snapchat", { mediaId: medium.id });

  const url = await this.getSignedUrlForFile(medium);
  this.#requests.push({ videoUploadRequest: { url } });

  const res  = await fetch("https://adsapi.snapchat.com/v1/media/upload/video", {
    method: "POST",
    headers: { Authorization: `Bearer ${account.access_token}` },
    body: JSON.stringify({ source_url: url }),
  });
  const data = await res.json();
  this.#responses.push({ videoUploadResponse: data });

  if (!res.ok) throw new Error(data.error_message ?? `Video upload failed: HTTP ${res.status}`);
  return data.media_id as string;
}

async #processImages(
  media: PostMedia[],
  account: SocialAccount,
  config: SnapchatConfiguration,
): Promise<string> {
  logger.log("Uploading images to Snapchat", { count: media.length });

  const allowed = media.filter(m => m.type !== "video").slice(0, this.#MAX_IMAGES);
  const ids: string[] = [];

  for (const medium of allowed) {
    this.#requests.push({ imageUploadRequest: { mediaId: medium.id } });
    const file = await this.getFile(medium);
    // … upload …
    this.#responses.push({ imageUploadResponse: { uploaded: medium.id } });
    ids.push(medium.id);
  }

  return ids.join(",");
}
```

### 4e. Caption sanitisation

Every platform has limits. Add a `#sanitizeCaption` (or similar) private method
rather than putting string manipulation inline inside `post`.

```ts
#sanitizeCaption(caption: string): string {
  return caption.trim().slice(0, this.#CHAR_LIMIT);
}
```

### 4f. Human-readable error helper

The `error_message` field is shown directly to end-users. Make it clear and
actionable. Use a dedicated helper to avoid repeating the same logic.

```ts
#humanError(error: any): string {
  const apiMsg = error?.response?.data?.error_message
    ?? error?.response?.data?.message
    ?? error?.message;

  if (error?.response?.status === 401) {
    return "Your Snapchat account needs to be reconnected — the access token has expired.";
  }
  if (error?.response?.status === 403) {
    return "Permission denied by Snapchat. Check that the account has the required scopes.";
  }
  if (apiMsg?.toLowerCase().includes("rate limit")) {
    return "Snapchat rate limit reached. Please wait a few minutes and try again.";
  }

  return `Failed to post to Snapchat: ${apiMsg ?? "unknown error"}. Check the details for more information.`;
}
```

---

## 5. Logging conventions

- Use `logger.log(...)` from `@trigger.dev/sdk/v3` for progress milestones
  (job started, media uploaded, post published, etc.).
- Use `console.error(...)` for caught exceptions before returning the failure
  result.
- Every external HTTP request gets a corresponding entry in `this.#requests`
  immediately before the call; every response (success or error) gets an entry
  in `this.#responses` immediately after.
- Log key field values (IDs, status codes, URLs) — never log full access tokens.

---

## 6. `details` object contract

`details` is a plain object stored in the database and visible to admins. It
must always include:

```ts
details: {
  requests:  this.#requests,   // array of request snapshots
  responses: this.#responses,  // array of response snapshots
  // optional extras:
  warning?:    string,         // non-fatal caveats (e.g. "only first 10 items posted")
  addedMedia?: { key: string; bucket: string }[], // temp files written to Supabase Storage
  // additional error context not suitable for error_message:
  error?:      any,            // raw error object on failure paths
}
```

---

## 7. Document in the API DTO — `post-configurations.dto.ts`

### 7a. Add the platform DTO class

Place it alongside the other platform classes. Extend `BaseConfigurationDto`
which already provides `caption` and `media`.

```ts
export class SnapchatConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Snapchat post placement',
    enum: ['spotlight', 'story'],
    nullable: true,
    required: false,
  })
  placement?: 'spotlight' | 'story';

  @ApiProperty({
    description: 'Allow resharing of this snap',
    nullable: true,
    required: false,
    default: true,
  })
  allow_resharing?: boolean;
}
```

### 7b. Add to the `PlatformConfiguration` union

```ts
export type PlatformConfiguration =
  | PinterestConfigurationDto
  // … existing …
  | SnapchatConfigurationDto; // <- append
```

### 7c. Add to `PlatformConfigurationsDto`

```ts
@ApiProperty({
  description: 'Snapchat configuration',
  type: SnapchatConfigurationDto,
  required: false,
  nullable: true,
})
snapchat?: SnapchatConfigurationDto;
```

### 7d. Add every new field to `AccountConfigurationDetailsDto`

This flat DTO is used for account-level overrides. Add each new platform-specific
field here with the same `@ApiProperty` decorator and notes about which platforms
use it.

```ts
@ApiProperty({
  description: 'Snapchat post placement (spotlight or story)',
  enum: ['spotlight', 'story'],
  nullable: true,
  required: false,
})
placement?: 'spotlight' | 'story';

@ApiProperty({
  description: 'Allow resharing of this snap (Snapchat)',
  nullable: true,
  required: false,
  default: true,
})
allow_resharing?: boolean;
```

---

## 8. Checklist

Work through this list before marking the task done:

- [ ] `<Platform>Configuration` interface in `post.types.ts`
- [ ] `PlatformConfiguration` union updated in `post.types.ts`
- [ ] `platformConfig` union updated in `post-client.ts` `post()` signature
- [ ] `<Platform>Configuration` imported in `post-client.ts`
- [ ] `trigger/posting/platforms/<platform>-post-client.ts` created
  - [ ] Extends `PostClient`
  - [ ] Constructor stores `app_id` / `app_secret` from `appCredentials`
  - [ ] `refreshAccessToken` implemented and logs requests/responses
  - [ ] `post()` is clean — delegates media work to private helpers
  - [ ] Separate `#processVideo` / `#processImages` (or equivalent) methods
  - [ ] Caption sanitised in a private helper method
  - [ ] All requests logged to `#requests` before the call
  - [ ] All responses (including errors) logged to `#responses` after the call
  - [ ] `details` always contains `requests` and `responses`
  - [ ] `error_message` is human-friendly and actionable
  - [ ] Additional error context goes in `details.error`, not in `error_message`
  - [ ] `logger.log` calls at key milestones
- [ ] `<Platform>ConfigurationDto` class in `post-configurations.dto.ts`
- [ ] New DTO added to `PlatformConfiguration` union in `post-configurations.dto.ts`
- [ ] New DTO added to `PlatformConfigurationsDto`
- [ ] All new fields added to `AccountConfigurationDetailsDto`
- [ ] `bun run typecheck` passes in `trigger/`
- [ ] `bun run lint` passes in `trigger/` and `api/`

---

## 9. Reference: base class helpers

These methods are available from `PostClient` and should be reused rather than
re-implemented:

| Method | Description |
|---|---|
| `getFile(medium)` | Downloads a `PostMedia` item and returns a `File` |
| `getSignedUrlForFile(medium)` | Returns the public URL for a `PostMedia` item |
| `downloadToTempFile(url, opts?)` | Downloads a URL to a temp file on disk; returns `{ filePath, mimeType, size }` |
| `unlinkQuiet(filePath)` | Deletes a temp file, suppressing any error |

Always call `unlinkQuiet` in a `finally` block after `downloadToTempFile`.
