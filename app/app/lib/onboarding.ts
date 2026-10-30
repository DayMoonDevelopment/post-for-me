/**
 * Onboarding is version-controlled by a single constant. When a user finishes
 * onboarding, the server stamps their PostHog person with
 * `onboarding_completed_version = ONBOARDING_VERSION`. The `show_onboarding`
 * feature flag's release condition is "onboarding_completed_version is not set
 * OR is less than the current version" — so bumping this constant (and the
 * flag's number in PostHog) re-surfaces onboarding to everyone who only saw an
 * older cut. Leaving the flag number unchanged on a bump means "don't re-show".
 *
 * This module is intentionally free of `.server`-only and client-only imports
 * so both the client provider and the server action can share these contracts.
 */
export const ONBOARDING_VERSION = 1;

/** PostHog feature flag key the client reads to decide whether to auto-open. */
export const SHOW_ONBOARDING_FLAG = "show_onboarding";

/**
 * Ordered step ids for the onboarding flow. MUST stay in sync with the slide
 * order assembled in `onboarding-provider.tsx`. Used as the stable `step` label
 * on the client-side analytics events so every onboarding interaction reports a
 * consistent name (telemetry skill: static snake_case, never interpolated) and
 * the whole flow can be charted as a single funnel broken down by `step`.
 *
 * Project setup is two steps: `project_name` (a single large TypeForm-style
 * input) then `project_type` (the credential-model cards). The project row is
 * committed once, on leaving `project_type` (both refs are populated by then) —
 * which also keeps it ahead of the `review` credentials write that RLS requires.
 *
 * `review` is the always-present hub after `project_type`: it confirms the name
 * + type, edits the enabled platforms, and (white-label only) drills into
 * per-platform developer keys via an in-modal master-detail. It's where the
 * credential drafts are committed, so it stays a fixed step.
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "segment",
  "platforms",
  "volume",
  "project_name",
  "project_type",
  "review",
  "billing",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** "Which describes you best?" — the first-slide segmentation answers. */
export const ONBOARDING_SEGMENTS = [
  "saas",
  "agent",
  "marketing",
  "personal",
  "other",
] as const;
export type OnboardingSegment = (typeof ONBOARDING_SEGMENTS)[number];

export function isOnboardingSegment(
  value: unknown,
): value is OnboardingSegment {
  return (
    typeof value === "string" &&
    (ONBOARDING_SEGMENTS as readonly string[]).includes(value)
  );
}

/** The platforms a user can say they expect to post to. Ids match the API. */
export const ONBOARDING_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "facebook",
  "linkedin",
  "pinterest",
  "threads",
  "bluesky",
] as const;
export type OnboardingPlatform = (typeof ONBOARDING_PLATFORMS)[number];

export function isOnboardingPlatform(
  value: unknown,
): value is OnboardingPlatform {
  return (
    typeof value === "string" &&
    (ONBOARDING_PLATFORMS as readonly string[]).includes(value)
  );
}

/**
 * The FULL set of social providers the API + DB support (the `social_provider`
 * enum), including the connection-type variants `instagram_w_facebook`,
 * `x_oauth2`, and `tiktok_business`. {@link ONBOARDING_PLATFORMS} is the narrower set surfaced in
 * the onboarding "what do you post to" step; the project settings page manages
 * this complete set. Every `OnboardingPlatform` is also a `SocialProvider`.
 */
export const SOCIAL_PROVIDERS = [
  "facebook",
  "instagram",
  "instagram_w_facebook",
  "x",
  "x_oauth2",
  "tiktok",
  "tiktok_business",
  "youtube",
  "pinterest",
  "linkedin",
  "bluesky",
  "threads",
] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export function isSocialProvider(value: unknown): value is SocialProvider {
  return (
    typeof value === "string" &&
    (SOCIAL_PROVIDERS as readonly string[]).includes(value)
  );
}

/** Expected posting volume tiers (social posts), drive the recommended plan. */
export const ONBOARDING_VOLUMES = [
  "1000",
  "2500",
  "5000",
  "10000",
  "20000",
  "40000",
  "100000",
  "200000",
] as const;
export type OnboardingVolume = (typeof ONBOARDING_VOLUMES)[number];

export function isOnboardingVolume(value: unknown): value is OnboardingVolume {
  return (
    typeof value === "string" &&
    (ONBOARDING_VOLUMES as readonly string[]).includes(value)
  );
}

/**
 * Intents posted to the `/onboarding` resource action. Selections are tracked
 * client-side now (see `onboarding-analytics.ts`); the server only records the
 * durable end-of-flow outcome and stamps the final person properties.
 */
export type OnboardingIntent = "complete" | "skip";

/** PostHog person-property keys (telemetry skill: static snake_case names). */
export const PERSON_PROP_COMPLETED_VERSION = "onboarding_completed_version";
export const PERSON_PROP_SEGMENT = "onboarding_segment";
export const PERSON_PROP_PLATFORMS = "onboarding_platforms";
export const PERSON_PROP_VOLUME = "onboarding_volume";

/**
 * A single provider's developer app credentials, as collected on the white-label
 * `keys` step. The `provider` is one of the {@link OnboardingPlatform} ids (which
 * are also valid `social_provider` enum values in the API). Both fields are
 * needed before the platform can actually post, but either may be submitted on
 * its own: a member can fill one, save, and come back for the other. An empty
 * field means "leave whatever is stored alone", never "clear it".
 */
export type OnboardingCredential = {
  appId: string;
  appSecret: string;
  provider: SocialProvider;
};

/**
 * What a provider's stored credential row CONTAINS, without containing it —
 * presence booleans derived on the server and nothing else.
 *
 * This is the only credential shape a page loader may hand a client. The values
 * themselves travel exclusively through `/api/projects/:projectId/credentials`,
 * fetched one provider at a time on explicit user action, and never at all for a
 * Quickstart project (whose keys are Post for Me's, not the member's).
 */
export type ProviderCredentialStatus = {
  hasAppId: boolean;
  hasAppSecret: boolean;
  provider: SocialProvider;
};

/**
 * Parse the JSON-encoded credentials array sent with the `credentials` intent.
 * Drops anything that isn't a known platform, and anything with nothing to say
 * (both fields blank) — but a partial entry IS kept, so a member can save one
 * field now and the other later. The upsert merges blanks onto the stored row.
 */
export function parseOnboardingCredentials(
  raw: FormDataEntryValue | null,
): OnboardingCredential[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { provider, appId, appSecret } = entry as Record<string, unknown>;
    if (!isSocialProvider(provider)) return [];
    if (typeof appId !== "string" || typeof appSecret !== "string") return [];
    if (appId.trim() === "" && appSecret.trim() === "") return [];
    return [{ provider, appId: appId.trim(), appSecret: appSecret.trim() }];
  });
}
