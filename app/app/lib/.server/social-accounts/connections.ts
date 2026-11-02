import type { TypedSupabaseClient } from "~/lib/.server/supabase";
import type { Database } from "~/lib/.server/supabase.types";
import type { SocialProvider } from "~/lib/onboarding";

import { logError } from "~/lib/.server/errors";
import {
  createFileStorageService,
  type StorageClient,
} from "~/lib/.server/services/file-storage";
import {
  deriveStatus,
  type SocialAccount,
} from "~/lib/types/social-account";

import type {
  Provider,
  SocialProviderConnection,
  SocialProviderInfo,
} from "./types";

import {
  redirectAppUrl,
  SOCIAL_ACCOUNT_PHOTO_BUCKET_NAME,
} from "./constants";
import { getBlueskySocialProviderConnection } from "./providers/bluesky.social-account";
import { getFacebookSocialProviderConnection } from "./providers/facebook.social-account";
import { getInstagramWFacebookSocialProviderConnection } from "./providers/instagram-w-facebook.social-account";
import { getInstagramSocialProviderConnection } from "./providers/instagram.social-account";
import { getLinkedInSocialProviderConnection } from "./providers/linkedin.social-account";
import { getPinterestSocialProviderConnection } from "./providers/pinterest.social-account";
import { getThreadsSocialProviderConnection } from "./providers/threads.social-account";
import { getTikTokBusinessSocialProviderConnection } from "./providers/tiktok-business.social-account";
import { getTikTokSocialProviderConnection } from "./providers/tiktok.social-account";
import { getXOAuth2SocialProviderConnection } from "./providers/x-oauth2.social-account";
import { getXSocialProviderConnection } from "./providers/x.social-account";
import { getYoutubeSocialProviderConnection } from "./providers/youtube.social-account";

type DbSocialProvider = Database["public"]["Enums"]["social_provider"];

/**
 * Complete an OAuth return for `provider` into one or more connected accounts.
 *
 * Ported 1:1 from the old dashboard (the token-exchange had no home in the
 * NestJS API — the provider redirects back HERE). Flow:
 *   1. Rebuild the exact `redirect_uri` the flow started with (system/quickstart
 *      vs white-label vs an explicit override) — providers require a byte match.
 *   2. Exchange the code/verifier with the provider ({@link getSocialProviderConnections}).
 *   3. Mirror each profile photo into our bucket ({@link getPublicProfilePhotoUrl}).
 *   4. Enforce the `external_id` uniqueness rule, then upsert the rows.
 *
 * Requires the service-role client: it writes across project boundaries with no
 * signed-in user (the caller is an external redirect).
 */
export async function addSocialAccountConnections({
  projectId,
  provider,
  request,
  supabaseServiceRole,
  isSystem,
  appCredentials,
  externalId,
  redirectUrlOverride,
}: {
  appCredentials: {
    appId?: string | null;
    appSecret?: string | null;
  };
  externalId: string | undefined | null;
  isSystem: boolean;
  projectId: string;
  provider: string;
  redirectUrlOverride: string | undefined | null;
  request: Request;
  supabaseServiceRole: TypedSupabaseClient;
}): Promise<{
  errors: string[];
  failedConnections: string[];
  successConnections: string[];
}> {
  const errors: string[] = [];
  const failedConnections: string[] = [];
  const normalizedProvider =
    provider === "instagram_w_facebook"
      ? "instagram"
      : provider === "x_oauth2"
        ? "x"
        : provider;

  const appUrl = redirectAppUrl();
  let redirectUri = `${appUrl}/callback/${projectId}/${normalizedProvider}/account`;

  if (isSystem) {
    redirectUri = `${appUrl}/callback/${normalizedProvider}/account`;
  }

  if (redirectUrlOverride) {
    redirectUri = redirectUrlOverride;
  }

  // Profile photos live on Supabase Storage today; flip this to `.using("r2")`
  // (and move the bucket) to migrate them.
  const storage = createFileStorageService().using("supabase");

  const socialProviderConnections: SocialProviderConnection[] =
    await getSocialProviderConnections(provider, {
      redirectUri,
      request,
      appCredentials,
      supabaseServiceRole,
      projectId,
    });

  let connectionsToInsert = await Promise.all(
    socialProviderConnections.map(async (connection) => ({
      provider: normalizedProvider as Provider,
      project_id: projectId,
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      access_token_expires_at: connection.access_token_expires_at.toISOString(),
      refresh_token_expires_at: connection.refresh_token_expires_at
        ? connection.refresh_token_expires_at.toISOString()
        : null,
      social_provider_user_id: connection.social_provider_user_id,
      social_provider_user_name: connection.social_provider_user_name,
      social_provider_profile_photo_url: await getPublicProfilePhotoUrl({
        profilePhotoUrl: connection.social_provider_photo_url,
        projectId,
        provider,
        providerId: connection.social_provider_user_id,
        storage,
      }),
      social_provider_metadata: connection.social_provider_metadata,
      external_id: externalId,
    })),
  );

  if (externalId) {
    const socialProviderUserIds = connectionsToInsert.map(
      (c) => c.social_provider_user_id,
    );
    const { data: existingConnections, error: existingConnectionsError } =
      await supabaseServiceRole
        .from("social_provider_connections")
        .select("id,social_provider_user_id")
        .eq("project_id", projectId)
        .eq("provider", normalizedProvider as DbSocialProvider)
        .in("social_provider_user_id", socialProviderUserIds)
        .not("access_token", "is", null)
        .not("external_id", "is", null)
        .neq("external_id", externalId);

    if (existingConnectionsError) {
      logError(existingConnectionsError, {
        projectId,
        provider: normalizedProvider,
        surface: "addSocialAccountConnections.externalId",
      });
      throw new Error("Error validating the external id");
    }
    if (existingConnections && existingConnections.length > 0) {
      connectionsToInsert = connectionsToInsert.filter((c) =>
        existingConnections.every(
          (ec) => ec.social_provider_user_id !== c.social_provider_user_id,
        ),
      );

      failedConnections.push(...existingConnections.map((e) => e.id));

      errors.push(
        ...failedConnections.map(
          (f) => `External Id already exists for account ${f}`,
        ),
      );
    }
  }

  const { data: insertedConnections, error: connectionsError } =
    await supabaseServiceRole
      .from("social_provider_connections")
      .upsert(connectionsToInsert, {
        onConflict: "provider,project_id,social_provider_user_id",
      })
      .select();

  if (insertedConnections && insertedConnections.length > 0) {
    // TODO(PFM connect vertical): dispatch the `social.account.created`
    // process-webhooks event here. The old dashboard fired this via
    // `@trigger.dev/sdk` (`tasks.batchTrigger("process-webhooks", …)`), which is
    // NOT installed in the v2 dashboard. Until that is wired (either the
    // trigger.dev SDK is added back or the API owns webhook dispatch on connect),
    // customers are NOT notified of accounts connected through this callback.
    console.warn(
      `[social-accounts] ${insertedConnections.length} connection(s) upserted for project ${projectId} but the connection webhook was NOT dispatched — trigger.dev is not wired in the v2 dashboard (see TODO in connections.ts).`,
    );
  }

  if (connectionsError) {
    logError(connectionsError, {
      projectId,
      provider: normalizedProvider,
      surface: "addSocialAccountConnections.upsert",
    });
  }
  return {
    successConnections: insertedConnections?.map((i) => i.id) || [],
    failedConnections,
    errors,
  };
}

async function getSocialProviderConnections(
  provider: string,
  info: SocialProviderInfo,
): Promise<SocialProviderConnection[]> {
  try {
    switch (provider) {
      case "tiktok":
        return getTikTokSocialProviderConnection(info);
      case "instagram":
        return getInstagramSocialProviderConnection(info);
      case "facebook":
        return getFacebookSocialProviderConnection(info);
      case "x":
        return getXSocialProviderConnection(info);
      case "x_oauth2":
        return getXOAuth2SocialProviderConnection(info);
      case "youtube":
        return getYoutubeSocialProviderConnection(info);
      case "linkedin":
        return getLinkedInSocialProviderConnection(info);
      case "pinterest":
        return getPinterestSocialProviderConnection(info);
      case "bluesky":
        return getBlueskySocialProviderConnection(info);
      case "threads":
        return getThreadsSocialProviderConnection(info);
      case "tiktok_business":
        return getTikTokBusinessSocialProviderConnection(info);
      case "instagram_w_facebook":
        return getInstagramWFacebookSocialProviderConnection(info);
      default:
        return [];
    }
  } catch (error) {
    logError(error, { provider, surface: "getSocialProviderConnections" });
    return [];
  }
}

/**
 * Registrable domains we'll mirror a profile photo FROM.
 *
 * The URL we're about to `fetch` comes back in a provider's API response, and
 * for Bluesky it is chosen by the account holder — so it is not ours to trust.
 * An unrestricted server-side fetch of a caller-influenced URL reaches whatever
 * the host can reach (link-local metadata endpoints, private ranges, internal
 * services) and parks the response at a public storage URL.
 *
 * Matched on the registrable suffix rather than exact hosts because provider
 * CDNs shard hostnames per region and rotate them (`p16-sign-va.tiktokcdn.com`,
 * `scontent-lax3-1.cdninstagram.com`). A host we haven't listed is not a
 * failure: mirroring is skipped and the account keeps the provider's own URL,
 * so the avatar still renders — it just isn't mirrored.
 */
const PROFILE_PHOTO_HOST_SUFFIXES = [
  "bsky.app",
  "bsky.social",
  "cdninstagram.com",
  "fbcdn.net",
  "ggpht.com",
  "googleusercontent.com",
  "licdn.com",
  "pinimg.com",
  "tiktokcdn.com",
  "tiktokcdn-eu.com",
  "tiktokcdn-us.com",
  "twimg.com",
];

/** Profile photos are thumbnails; anything larger is not one. */
const MAX_PROFILE_PHOTO_BYTES = 8 * 1024 * 1024;

/** True when `value` is an https URL on an allowlisted provider CDN. */
function isMirrorablePhotoUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // https only — plain http would also permit `http://169.254.169.254/…`.
  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  return PROFILE_PHOTO_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * One path segment of a storage key, reduced to characters that can't change
 * its shape.
 *
 * The key this builds lands in `projects/<id>/<provider>/<name>` and is written
 * with `upsert`, so a segment carrying `/` or `..` writes somewhere else in the
 * bucket — including over another project's photo. Everything outside the safe
 * set collapses to `_`.
 *
 * Note this is deliberately LOSSY (an all-non-Latin value reduces to the
 * placeholder), which is why the caller keys the filename on the provider's
 * user id rather than on a display name — see {@link getPublicProfilePhotoUrl}.
 */
function safeStorageSegment(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  // Leading dots can't survive the class above, but an all-unsafe value would
  // collapse to nothing — keep a stable placeholder so the key stays well-formed.
  return slug.replace(/^_+|_+$/g, "").slice(0, 64) || "account";
}

async function getPublicProfilePhotoUrl({
  profilePhotoUrl,
  projectId,
  providerId,
  storage,
  provider,
}: {
  profilePhotoUrl: string | undefined | null;
  projectId: string;
  provider: string;
  providerId: string;
  storage: StorageClient;
}): Promise<string> {
  if (!profilePhotoUrl) {
    return "";
  }

  // Not an allowlisted provider CDN → don't fetch it at all. The account keeps
  // the provider's URL (the same fallback every other failure below takes).
  if (!isMirrorablePhotoUrl(profilePhotoUrl)) {
    logError(
      new Error("Profile photo URL is not a mirrorable provider CDN URL"),
      { projectId, provider, surface: "getPublicProfilePhotoUrl" },
    );
    return profilePhotoUrl;
  }

  try {
    // Fetch the image
    const imageResponse = await fetch(profilePhotoUrl, { redirect: "error" });

    // Reject on the declared size before reading the body where we can.
    const declaredLength = Number(
      imageResponse.headers.get("content-length") ?? Number.NaN,
    );
    if (declaredLength > MAX_PROFILE_PHOTO_BYTES) {
      throw new Error(`Profile photo too large (${declaredLength} bytes)`);
    }

    const imageBlob = await imageResponse.blob();
    if (imageBlob.size > MAX_PROFILE_PHOTO_BYTES) {
      throw new Error(`Profile photo too large (${imageBlob.size} bytes)`);
    }

    // Keyed on the provider's user id, NOT the display name. The id is the
    // upsert conflict key for `social_provider_connections`, so it's unique per
    // (project, provider) by construction — whereas display names are lossy
    // once sanitized (two non-Latin handles reduce to the same segment) and
    // `upsert: true` would let one account overwrite another's photo.
    const fileName = `${safeStorageSegment(providerId)}_profile.jpg`;
    const filePath = `projects/${projectId}/${provider}/${fileName}`;

    // Mirror the photo into our storage + return its public URL. On any failure
    // we fall back to the provider's original URL (below).
    await storage.upload(SOCIAL_ACCOUNT_PHOTO_BUCKET_NAME, filePath, imageBlob, {
      contentType: "image/jpeg",
      upsert: true,
    });

    return storage.getPublicUrl(SOCIAL_ACCOUNT_PHOTO_BUCKET_NAME, filePath);
  } catch (uploadError) {
    logError(uploadError, {
      projectId,
      provider,
      surface: "getPublicProfilePhotoUrl",
    });
  }

  return profilePhotoUrl;
}

// Columns for the branded result page's account cards.
//
// `access_token` IS selected, despite everything else here being non-secret:
// `deriveStatus` needs to know whether a token exists to tell "connected" from
// "disconnected", and there's no way to ask PostgREST for that as a boolean
// without a view. It is consumed inside the mapper below and NEVER reaches the
// returned DTO — which is why the mapper lists every field explicitly instead
// of spreading the row. Keep it that way: a `...row` here would ship live
// provider tokens to a PUBLIC, unauthenticated page.
const DISPLAY_COLUMNS =
  "id, project_id, provider, social_provider_user_id, social_provider_user_name, social_provider_profile_photo_url, external_id, access_token, access_token_expires_at, created_at";

/**
 * Re-fetch the just-connected accounts for DISPLAY, by id, scoped to the project
 * the (verified) result token names. This is the anti-PII-injection seam: the
 * result page NEVER trusts account details from the URL — it takes only ids from
 * the signed token and reads the real, current rows here. Returns app-native
 * {@link SocialAccount} DTOs (no tokens).
 */
export async function readConnectionsForDisplay(
  supabaseServiceRole: TypedSupabaseClient,
  projectId: string,
  ids: string[],
): Promise<SocialAccount[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseServiceRole
    .from("social_provider_connections")
    .select(DISPLAY_COLUMNS)
    .eq("project_id", projectId)
    .in("id", ids);

  if (error) {
    logError(error, { projectId, surface: "readConnectionsForDisplay" });
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    // Rows are written by our own upsert, so `provider` is always a valid enum
    // value; the cast bridges the DB enum type to the app union (same members).
    platform: row.provider as SocialProvider,
    username: row.social_provider_user_name,
    avatarUrl: row.social_provider_profile_photo_url,
    platformId: row.social_provider_user_id,
    externalId: row.external_id,
    status: deriveStatus(row.access_token, row.access_token_expires_at),
    connectedAt: row.created_at,
  }));
}
