---
name: add-account-provider
description: Use when adding support for connecting social accounts for a new provider in post-for-me. Covers api/src/social-provider-connections/helper/auth-url.helper.ts OAuth URL generation and temporary metadata, dashboard callback provider implementations under dashboard/app/lib/.server/social-accounts/providers/, dashboard setup UI for quickstart/system and white-label projects, social-account.ts registration, provider DTO data, callback metadata, and database enum/typegen updates. Trigger whenever the user asks to add OAuth/account connection support, connect accounts for a platform, implement provider callbacks, exchange auth codes for tokens, save social_provider_connections, or expose a provider in project setup.
---

# Adding Social Account Connection Support

This skill describes how to add a new provider to the account connection flow end-to-end. It is separate from posting support: connecting an account means generating the provider authorization URL, handling the provider callback in the dashboard, exchanging callback data for tokens/profile data, and saving rows in `social_provider_connections`.

Follow the workflow below in order. Keep changes minimal and mirror the closest existing provider.

## Core Flow

1. API receives a request to create an auth URL.
2. `api/src/social-provider-connections/helper/auth-url.helper.ts` builds the provider redirect URI and authorization URL.
3. Any data needed after the redirect is saved to `social_provider_connection_oauth_data` with a stable `key_id`.
4. The provider redirects to dashboard callback routes.
5. `dashboard/app/lib/.server/social-accounts/social-account.ts` dispatches to a provider implementation.
6. The provider implementation exchanges the `code` or provider-specific callback params for tokens and profile/account data.
7. `addSocialAccountConnections` upserts rows into `social_provider_connections`, uploads the profile image when present, applies `external_id`, and triggers `social.account.created` webhooks.

## Files To Check

| File | What changes |
| --- | --- |
| `api/supabase/migrations/*.sql` | Add the new provider to the `social_provider` enum if it is not already present. |
| `api/src/social-provider-connections/dto/create-provider-auth-url.dto.ts` | Add optional `platform_data` shape if the auth URL needs extra input or permission overrides. |
| `api/src/social-provider-connections/helper/auth-url.helper.ts` | Add the provider case that generates the auth URL and saves temporary metadata. |
| `dashboard/app/lib/.server/social-accounts/providers/<provider>.social-account.ts` | Add the callback implementation that returns `SocialProviderConnection[]`. |
| `dashboard/app/lib/.server/social-accounts/social-account.ts` | Import/register the provider implementation in `getSocialProviderConnections`. |
| `dashboard/app/lib/.server/social-accounts/social-account.types.ts` | Add the provider to the `Provider` union when persisted rows use that provider value. |
| `dashboard/app/routes/_protected.$teamId.$projectId.setup/_unstarted-grid.tsx` | Add the provider to the setup grid so both quickstart and white-label projects can enable it. |
| `dashboard/app/routes/_protected.$teamId.$projectId.setup.$provider._index/route.component.tsx` | Add credential labels to the default setup modal when the default app ID/app secret form is enough. |
| `dashboard/app/lib/utils.ts` | Add a human-readable label in `getProviderLabel` when the raw enum value is not user-friendly. |
| `dashboard/app/components/brand-icon.tsx` | Add an icon mapping if the provider needs its own brand icon. |
| `api/supabase/seed/09_system-credentials.sql` | Add placeholder system credentials when quickstart projects should be able to enable the provider locally. |
| `dashboard/app/routes/callback.$projectId.$provider.account/route.loader.ts` | Adjust only if the callback needs non-standard key lookup or generic metadata handling. |
| `dashboard/app/routes/callback.$provider.account/route.loader.ts` | Adjust only if system-credential callbacks need non-standard key lookup or generic metadata handling. |

## Database Provider Enum

If the provider is new to the database, add a migration in `api/supabase/migrations/`:

```sql
ALTER TYPE social_provider
    ADD VALUE IF NOT EXISTS '<provider>';
```

After a schema change, use the repo's dumb-monorepo workflow: run Supabase commands from `api/`, then regenerate types only in siblings that consume the changed enum.

Typical verification/typegen sequence:

```bash
# from api/
bun run supabase:reset
bun run supabase:typegen

# from dashboard/
bun run supabase:typegen
```

Do not run package, build, lint, test, or typegen commands from the repo root.

## API Auth URL Generation

Update `generateAuthUrl` in `api/src/social-provider-connections/helper/auth-url.helper.ts`.

Use the existing `callbackUrl` behavior unless the provider requires a special callback URL:

```ts
let callbackUrl =
  redirectUrlOverride || `${appUrl}/callback/${projectId}/${provider}/account`;

if (isSystem) {
  callbackUrl = `${appUrl}/callback/${provider}/account`;
}
```

The helper already saves these common metadata rows using `authState` as `key_id`:

| Key | Purpose |
| --- | --- |
| `project` | Lets the system callback route resolve the project for `/callback/:provider/account`. |
| `redirect_url` | Lets dashboard use a caller-provided redirect URI during the token exchange. |
| `external_id` | Lets dashboard persist the caller's account identifier. |

Add a `switch` case for the new provider:

```ts
case '<provider>': {
  const scopes: string[] = [];

  if (
    providerData?.<provider>?.permission_overrides &&
    providerData.<provider>.permission_overrides.length > 0
  ) {
    scopes.push(...providerData.<provider>.permission_overrides);
  } else {
    scopes.push(...['default.scope']);

    if (permissions.includes('feeds')) {
      scopes.push('feed.or.analytics.scope');
    }
  }

  const authParams = new URLSearchParams([
    ['client_id', appId],
    ['redirect_uri', callbackUrl],
    ['scope', scopes.join(',')],
    ['response_type', 'code'],
    ['state', authState],
  ]);

  authUrl = `https://provider.example/oauth/authorize?${authParams.toString()}`;
  break;
}
```

Prefer `URLSearchParams` over manual string concatenation. Match the provider's required scope delimiter: comma for most existing providers, space for LinkedIn.

### Temporary OAuth Metadata

Use `social_provider_connection_oauth_data` when callback code needs information that is not returned by the provider redirect.

Pattern:

```ts
oauthData.push({
  project_id: projectId,
  provider: '<provider>' as SocialProviderEnum,
  key: '<metadata_key>',
  key_id: authState,
  value: '<metadata_value>',
});
```

Use `authState` as `key_id` for normal OAuth2 providers because dashboard callback loaders read the `state` query param. If the provider uses a non-standard callback identifier, mirror X: save metadata using the provider callback token as `key_id`, and update callback key extraction if needed.

Provider-specific examples to mirror:

| Provider | Pattern |
| --- | --- |
| `x` | OAuth 1.0. Saves `oauth_token` secret using `authLink.oauth_token` as `key_id`; callback key is `oauth_token`, not `state`. |
| `bluesky` | Not a normal OAuth redirect. Saves `app_password` keyed by sanitized handle and returns the dashboard callback URL with `handle` and `state`. |
| `instagram_w_facebook` | Auth URL provider differs from persisted provider. Saves `connection_type=facebook`, redirects as `instagram`, and dashboard normalizes back to `instagram_w_facebook` for credential lookup. |

If the callback loaders must read a new metadata key generically, add it to the `.in('key', [...])` list in both callback loaders. If only the provider implementation needs it, query `social_provider_connection_oauth_data` inside the provider file using `supabaseServiceRole`, `projectId`, provider, key, and `state` or the provider-specific callback key.

## Auth URL DTO Provider Data

If callers can supply provider-specific auth input, update `api/src/social-provider-connections/dto/create-provider-auth-url.dto.ts`.

For normal OAuth providers, expose `permission_overrides?: string[]`:

```ts
export class ExampleProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default scopes: default.scope, another.scope',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}
```

Then add it to `AuthUrlProviderData`:

```ts
@ApiProperty({
  description: 'Additional data for connecting Example accounts',
  required: false,
  type: ExampleProviderData,
})
example?: ExampleProviderData;
```

Only add fields the auth URL helper actually uses. Keep API DTO property names snake_case when they are request payload fields.

## Dashboard Provider Implementation

Create `dashboard/app/lib/.server/social-accounts/providers/<provider>.social-account.ts`.

The function must return `SocialProviderConnection[]`. Return multiple entries when one authorization grants access to multiple accounts/pages/channels.

Skeleton for a standard OAuth2 code exchange:

```ts
import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

export async function getExampleSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const tokenResponse = await fetch("https://provider.example/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams([
      ["grant_type", "authorization_code"],
      ["client_id", appCredentials.appId!],
      ["client_secret", appCredentials.appSecret!],
      ["redirect_uri", redirectUri],
      ["code", code],
    ]),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("Error fetching access token", tokenData);
    throw Error("Error fetching access token");
  }

  const profileResponse = await fetch("https://provider.example/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profileData = await profileResponse.json();

  return [
    {
      social_provider_user_id: profileData.id,
      social_provider_user_name: profileData.username || profileData.name,
      social_provider_photo_url: profileData.avatar_url,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      access_token_expires_at: new Date(
        Date.now() + tokenData.expires_in * 1000,
      ),
      refresh_token_expires_at: tokenData.refresh_expires_in
        ? new Date(Date.now() + tokenData.refresh_expires_in * 1000)
        : undefined,
      social_provider_metadata: {
        connection_type: "profile",
      },
    },
  ];
}
```

Use double quotes in dashboard files if the surrounding file does. Keep provider files focused: parse callback params, exchange tokens, fetch profile/account data, and map to `SocialProviderConnection`.

### Required Connection Fields

Each returned connection must include:

| Field | Notes |
| --- | --- |
| `access_token` | Saved directly to `social_provider_connections.access_token`. |
| `access_token_expires_at` | Use provider `expires_in` when available. If the provider does not expire tokens, choose an explicit far-future date and document why. |
| `social_provider_user_id` | Stable provider account ID used in the upsert conflict key. Do not use display names unless the provider has no stable ID. |
| `social_provider_user_name` | Human-readable username/page/channel name. |
| `refresh_token` | Include when the provider supports refresh. |
| `refresh_token_expires_at` | Include when the provider returns it. |
| `social_provider_photo_url` | Optional source URL. `social-account.ts` uploads it to Supabase storage. |
| `social_provider_metadata` | Optional JSON for connection type, premium status, app-password details, page/profile distinction, or later posting needs. |

Avoid swallowing token exchange errors. `getSocialProviderConnections` catches provider errors and returns an empty list, so provider functions should throw with useful messages when required callback data or token/profile data is missing.

## Register The Dashboard Provider

Update `dashboard/app/lib/.server/social-accounts/social-account.ts`:

```ts
import { getExampleSocialProviderConnection } from "./providers/example.social-account";
```

Then add a switch branch:

```ts
case "example":
  return getExampleSocialProviderConnection(info);
```

If the persisted provider value is new, add it to `Provider` in `dashboard/app/lib/.server/social-accounts/social-account.types.ts`.

If the auth provider and persisted provider differ, follow the Instagram with Facebook pattern:

1. Normalize the provider for callback URLs and persisted rows.
2. Save a `connection_type` row in API auth URL generation.
3. Read `connection_type` in both callback loaders.
4. Switch to the actual credential provider before credential lookup.
5. Persist the normalized provider expected by `social_provider_connections`.

## Dashboard Setup UI

New providers must appear in project setup so users can enable the platform before connecting accounts.

There are two setup paths:

| Project type | UI path | Behavior |
| --- | --- | --- |
| Quickstart/system project | `dashboard/app/routes/_protected.$teamId.$projectId.setup.system.$provider._index/` | User clicks Enable/Disable. The action copies credentials from `system_social_provider_app_credentials` into `social_provider_app_credentials`. |
| White-label project | `dashboard/app/routes/_protected.$teamId.$projectId.setup.$provider._index/` | User enters provider app credentials. The generic action upserts `app_id` and `app_secret`. |

### Add The Provider To The Setup Grid

Update `allPlatforms` in `dashboard/app/routes/_protected.$teamId.$projectId.setup/_unstarted-grid.tsx`:

```ts
const allPlatforms = [
  "facebook",
  "instagram",
  // ...existing providers
  "example",
] as const;
```

This drives the setup tiles for both quickstart/system and white-label projects. Do not add the provider to `providersComingSoon` unless the UI should intentionally show a disabled Coming Soon button.

The connected grid reads existing credentials from the loader, so adding the platform to `allPlatforms` plus saving credentials is usually enough for it to show as configured.

### White-Label Credential Modal

Use the default route when the provider only needs an app ID/client ID and app secret/client secret:

| File | Purpose |
| --- | --- |
| `dashboard/app/routes/_protected.$teamId.$projectId.setup.$provider._index/route.loader.ts` | Loads the project's existing credential and exposes `redirectUrl`. |
| `dashboard/app/routes/_protected.$teamId.$projectId.setup.$provider._index/route.component.tsx` | Shows redirect URL plus app credential inputs. |
| `dashboard/app/routes/_protected.$teamId.$projectId.setup.$provider._index/route.action.ts` | Saves/deletes `social_provider_app_credentials`. |

Add provider-specific credential labels to `defaultLabels` only when the generic labels are not accurate:

```ts
const defaultLabels = {
  // existing labels
  example: { appId: "Client ID", appSecret: "Client Secret" },
} as const;
```

Do not create a provider-specific setup route just to change labels, guide text, or the normal app credential form.

### Quickstart/System Enablement

Quickstart projects use the system setup route. The generic system action fetches a row from `system_social_provider_app_credentials`; enabling fails if that row does not exist.

For local seed data, add a placeholder row in `api/supabase/seed/09_system-credentials.sql` when quickstart should support the new provider:

```sql
('example', 'example_app_id', 'example_app_secret')
```

For real environments, make sure the system credential is configured out of band. Do not hard-code production secrets in code, migrations, or seed files.

### Labels And Icons

If the enum value is not already user-friendly, add a label in `dashboard/app/lib/utils.ts`:

```ts
example: "Example",
```

If there is a provider icon available, add it to `dashboard/app/components/brand-icon.tsx`. If no icon exists, the current fallback is `TriangleExclamationIcon`; prefer adding a real brand icon when exposing a production provider.

For provider variants like `instagram_w_facebook` or `tiktok_business`, the setup grid often passes `provider.split("_")[0]` to `BrandIcon`; only add a new icon key when that fallback is wrong.

### Provider-Specific Setup Overrides

Only add a provider-specific route directory when the default setup modal cannot represent the provider's required settings.

Valid reasons for an override include:

- Extra setup artifacts, like TikTok verification files in `dashboard/app/routes/_protected.$teamId.$projectId.setup.tiktok/`.
- Different redirect URL or callback URL display requirements, like `instagram_w_facebook` displaying the `instagram` callback URL.
- No app credentials are required, like the current Bluesky setup explainer.
- A provider is intentionally gated or coming soon, like the current TikTok Business modal.
- Additional validated fields must be persisted somewhere beyond `social_provider_app_credentials.app_id` and `app_secret`.

When creating an override, mirror the closest existing route folder and include only the pieces needed:

| Override file | Add when |
| --- | --- |
| `route.tsx` | Always, to export the custom loader/action/component. |
| `route.loader.ts` | The modal needs custom data, redirect URL, files, flags, or hard-coded normalized provider behavior. |
| `route.action.ts` | Saving requires more than the generic `app_id`/`app_secret` upsert/delete. |
| `route.component.tsx` | The UI needs additional fields, copyable values, explanatory content, or custom validation. |
| Local components | The override has reusable subsections, like `_credentials-form.tsx` or `_verification-files.tsx`. |

Do not duplicate the default route for a normal OAuth provider. The default route keeps future setup behavior consistent across providers.

## Callback Routes

There are two dashboard callback loaders:

| Route | Used for |
| --- | --- |
| `dashboard/app/routes/callback.$projectId.$provider.account/route.loader.ts` | Project-specific callback URLs. |
| `dashboard/app/routes/callback.$provider.account/route.loader.ts` | System credential callback URLs; resolves `projectId` from OAuth data. |

Default key lookup is `state`. X is the exception and uses `oauth_token`:

```ts
const key =
  provider?.toLowerCase() === "x"
    ? (url.searchParams.get("oauth_token") as string)
    : (url.searchParams.get("state") as string);
```

Only modify these routes if the new provider cannot send `state`, uses a different callback token, or requires generic metadata before calling `addSocialAccountConnections`.

## Verification

Always run lint and typecheck after implementation changes. Run commands from the sibling that owns the changed code:

| Changed area | Run from | Commands |
| --- | --- | --- |
| `api/src/social-provider-connections/helper/auth-url.helper.ts`, auth URL DTOs, API social-provider connection code, or API migrations/types | `api/` | `bun run typecheck` and `bun run lint` |
| Dashboard callback logic, provider token/profile exchange code, setup UI, labels/icons, or generated dashboard DB types | `dashboard/` | `bun run typecheck` and `bun run lint` |

If a change touches both API and dashboard, run both sets. Do not run these from the repo root.

```bash
# from api/
bun run typecheck
bun run lint

# from dashboard/
bun run typecheck
bun run lint
```

If you added or changed migrations/types, run the schema/typegen commands described above first. If a command is unavailable or blocked by local services, report that clearly.

## Final Checklist

- New provider enum exists in Supabase migrations when needed.
- API DTO accepts only the provider-specific auth inputs needed by `generateAuthUrl`.
- `generateAuthUrl` returns a provider auth URL with the correct redirect URI, scopes, `response_type`, and `state`.
- Any callback metadata needed later is saved in `social_provider_connection_oauth_data` with the correct `project_id`, `provider`, `key`, `key_id`, and `value`.
- Dashboard callback can recover `projectId`, `external_id`, `redirect_url`, and any special connection type.
- Dashboard provider implementation exchanges callback params for access/refresh tokens and profile/account data.
- Provider returns one or more complete `SocialProviderConnection` objects.
- `social-account.ts` imports and dispatches to the new provider.
- `Provider` union and generated DB types are updated when the persisted enum value changed.
- Setup grid includes the provider in `allPlatforms` so it appears for quickstart and white-label projects.
- White-label setup uses the default credential modal unless additional provider-specific settings are required.
- Quickstart setup has a matching `system_social_provider_app_credentials` row wherever system credentials should support the provider.
- Provider labels and icons are added when the raw enum value or fallback icon would look wrong in the dashboard.
- Typecheck and lint were run from `api/` and `dashboard/`, or skipped with a stated reason.
