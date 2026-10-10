import type {
  ProviderCredentialStatus,
  SocialProvider,
} from "~/lib/onboarding";
import type { BrandMeta, BrandVariant } from "~/lib/platform-meta";
import type { ProjectType } from "~/lib/types/project";

import { PLATFORM_BRANDS, recommendedVariant } from "~/lib/platform-meta";

/**
 * Whether a project can actually connect accounts on a given BRAND — resolved
 * once, here, so every surface agrees.
 *
 * The subtlety this exists to absorb: enablement is stored per
 * `social_provider`, but Instagram and TikTok each span two of them. Asking
 * "is TikTok set up?" by looking up the `tiktok` row alone gets it wrong for a
 * project connected through the Business API, whose row is `tiktok_business`.
 * Callers ask about the brand and get back which variants are live.
 *
 * The project settings page renders this directly. The connect modal's
 * `PlatformConnectStatusMap` has no producer yet; when a surface wires one up,
 * it should derive it from here rather than re-deriving per-provider status.
 */

/**
 * A brand's setup state, shown as an inset status dot on its avatar:
 * - `idle` — not enabled (gray), `setup` — enabled but missing keys (warning),
 * - `done` — enabled and ready (success).
 */
export type BrandState = "idle" | "setup" | "done";

export type BrandReadiness = {
  brand: BrandMeta;
  /** Variants with a credential row, in the brand's variant order. */
  enabled: BrandVariant[];
  /** Enabled variants that can actually be connected right now. */
  ready: BrandVariant[];
  state: BrandState;
};

/** A DRAFT credential (values held client-side, as onboarding collects them)
 * has usable keys once both fields are non-empty. For stored rows the client
 * never sees values — use {@link credentialComplete} on the status instead. */
export function credentialHasKeys(credential?: {
  appId: string;
  appSecret: string;
}): boolean {
  return Boolean(credential?.appId.trim() && credential?.appSecret.trim());
}

/** A STORED row is usable once the server reports both fields present. */
export function credentialComplete(status?: ProviderCredentialStatus): boolean {
  return Boolean(status?.hasAppId && status?.hasAppSecret);
}

/**
 * Whether one enabled variant is connectable. Quickstart rides Post for Me's
 * shared credentials, so the row's presence is the whole story; a variant with
 * no developer app to register (Bluesky) is likewise ready on enablement. Only
 * white-label variants that need their own app wait on keys.
 */
function variantReady(
  variant: BrandVariant,
  status: ProviderCredentialStatus | undefined,
  projectType: ProjectType,
): boolean {
  if (!status) return false;
  if (projectType === "quickstart") return true;
  if (variant.requiresKeys === false) return true;
  return credentialComplete(status);
}

/** Index a project's credential rows for lookup by provider. */
export function credentialsByProvider(
  credentials: ProviderCredentialStatus[],
): Map<SocialProvider, ProviderCredentialStatus> {
  return new Map(credentials.map((status) => [status.provider, status]));
}

/**
 * The single credential row a BRAND-LEVEL surface should read and write.
 *
 * Onboarding and the project-setup modal deliberately stay connection-type
 * agnostic — they offer "TikTok", not "TikTok (Business API)" — but a row still
 * has to be picked. Use whichever variant the project already has (variants are
 * ordered recommended-first, so an already-configured recommended method wins),
 * otherwise the recommended one. Without this, those surfaces would silently
 * write the Standard-API row while the settings page writes the Business one.
 */
export function primaryVariant(
  brand: BrandMeta,
  credentials: Map<SocialProvider, ProviderCredentialStatus>,
): BrandVariant {
  return (
    brand.variants.find((variant) => credentials.has(variant.id)) ??
    recommendedVariant(brand)
  );
}

export function resolveBrandReadiness(
  brand: BrandMeta,
  credentials: Map<SocialProvider, ProviderCredentialStatus>,
  projectType: ProjectType,
): BrandReadiness {
  const enabled = brand.variants.filter((variant) => credentials.has(variant.id));
  const ready = enabled.filter((variant) =>
    variantReady(variant, credentials.get(variant.id), projectType),
  );
  // A brand is only "done" once every variant the project opted into works —
  // one half-configured alternate should keep the row asking to be finished.
  const state: BrandState =
    enabled.length === 0 ? "idle" : ready.length === enabled.length ? "done" : "setup";

  return { brand, enabled, ready, state };
}

/** Every brand's readiness, in {@link PLATFORM_BRANDS} display order. */
export function resolveBrands(
  credentials: ProviderCredentialStatus[],
  projectType: ProjectType,
): BrandReadiness[] {
  const byProvider = credentialsByProvider(credentials);
  return PLATFORM_BRANDS.map((brand) =>
    resolveBrandReadiness(brand, byProvider, projectType),
  );
}
