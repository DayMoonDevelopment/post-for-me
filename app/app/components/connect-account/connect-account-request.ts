import type { ConnectSnippetInput } from "./connect-account-snippets";

import {
  blueskyPlatformData,
  instagramPlatformData,
  linkedinPlatformData,
} from "./connect-account-snippets";

/**
 * The connect-account form's raw values, as held by `ConnectAccountModal`. The
 * single source both the live code samples AND the real `createAuthURL` submit
 * derive from — so what the user sees in the code panel is exactly what we POST.
 */
export interface ConnectFormValues {
  blueskyAppPassword: string;
  blueskyHandle: string;
  externalId: string;
  instagramConnection: "facebook" | "instagram";
  linkedinConnection: "organization" | "personal";
  permissions: Record<"feeds" | "posts", boolean>;
  platform: string;
  tiktokApi: "business" | "standard";
}

/**
 * Reduce the form values to the `createAuthURL` request shape (the same
 * {@link ConnectSnippetInput} the code samples render): TikTok's Standard/Business
 * choice resolves the real provider, Bluesky carries no OAuth `permissions`, and
 * only the applicable provider's `platform_data` is attached.
 *
 * `placeholders` fills empty Bluesky credentials with illustrative values — on
 * for the code panel (so the sample always reads plausibly), off for the real
 * submit (where the Connect button is gated on non-empty credentials anyway).
 */
export function deriveConnectRequest(
  values: ConnectFormValues,
  { placeholders = false }: { placeholders?: boolean } = {},
): ConnectSnippetInput {
  const apiPlatform =
    values.platform === "tiktok"
      ? values.tiktokApi === "business"
        ? "tiktok_business"
        : "tiktok"
      : values.platform;

  // Bluesky authenticates with credentials, not OAuth scopes → no permissions.
  const selected =
    values.platform === "bluesky"
      ? null
      : (["posts", "feeds"] as const).filter((p) => values.permissions[p]);
  const permissions = selected && selected.length > 0 ? [...selected] : null;

  const platformData =
    values.platform === "instagram"
      ? instagramPlatformData(values.instagramConnection)
      : values.platform === "linkedin"
        ? linkedinPlatformData(values.linkedinConnection)
        : values.platform === "bluesky"
          ? blueskyPlatformData(
              values.blueskyHandle.trim() ||
                (placeholders ? "name.bsky.social" : ""),
              values.blueskyAppPassword.trim() ||
                (placeholders ? "xxxx-xxxx-xxxx-xxxx" : ""),
            )
          : null;

  return {
    platform: apiPlatform,
    externalId: values.externalId.trim(),
    permissions,
    platformData,
  };
}

/**
 * The extra `createAuthURL` body fields (everything beyond `platform` +
 * `external_id`) — the selected `permissions` and the nested `platform_data`
 * object keyed by provider — as the API expects them on the wire. Spread into
 * the request by {@link ~/lib/.server/services/social-accounts.service CreateAuthURLInput.config}.
 */
export function toAuthUrlConfig(
  request: ConnectSnippetInput,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (request.permissions) config.permissions = request.permissions;
  if (request.platformData) {
    config.platform_data = {
      [request.platformData.provider]: Object.fromEntries(
        request.platformData.fields.map((f) => [f.key, f.value]),
      ),
    };
  }
  return config;
}
