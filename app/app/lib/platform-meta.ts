import type { ComponentType } from "react";

import type { TranslationContentKey, TranslationKey } from "~/lib/i18n/config";
import type { OnboardingPlatform, SocialProvider } from "~/lib/onboarding";
import type { BrandSpec, BrandVariantSpec } from "~/lib/platform-brands";
import type { SocialProvider as AccountProvider } from "~/lib/post-for-me.types";

import { BRAND_SPECS } from "~/lib/platform-brands";
import { BRAND_MARKS, InstagramIcon } from "~/ui/brand-mark";

/**
 * The presentation layer over the brand topology in `~/lib/platform-brands`:
 * the same brands and connection methods, with their icons attached. Anything
 * that only needs the topology (above all the settings ACTION) should import
 * the pure module instead — this one pulls in the SVG registry.
 */

type BrandIcon = ComponentType<{ className?: string }>;

/** A provider's brand icon + display name. Names are brand proper nouns, so
 * they're not run through i18n. */
type ProviderMetaBase = {
  icon: BrandIcon;
  label: string;
  /** See {@link BrandSpec.requiresKeys}. */
  requiresKeys?: boolean;
};

/**
 * Base-brand metadata, keyed by the narrower {@link OnboardingPlatform} ids —
 * used by the onboarding slides + setup modal, which only deal with base brands.
 */
export type PlatformMeta = ProviderMetaBase & { id: OnboardingPlatform };

/**
 * Metadata for ANY provider, including the connection-type variants
 * (`instagram_w_facebook`, `tiktok_business`). The project settings page manages
 * this full set; every {@link PlatformMeta} is also a `ProviderMeta`.
 */
export type ProviderMeta = ProviderMetaBase & { id: SocialProvider };

/** One connection method, with its icon. */
export type BrandVariant = BrandVariantSpec & { icon: BrandIcon };

/**
 * A BRAND as a user thinks of it — "Instagram", "TikTok" — with the connection
 * variants it offers behind it. This is the unit the project settings page
 * presents: one row per brand, never one row per `social_provider`.
 */
export type BrandMeta = PlatformMeta & {
  /** See {@link BrandSpec.recommendationKey}. */
  recommendationKey?: TranslationContentKey;
  variants: BrandVariant[];
};

/**
 * Collapse a connectable provider to the ACCOUNT provider the registry brand
 * mark knows. The registry's `SocialProvider` models the 10 providers the API
 * returns; `instagram_w_facebook` is a connect-time config (it IS Instagram,
 * authed via Facebook), so it shares Instagram's mark. Use this whenever handing
 * a connectable provider to a registry `PlatformAvatar` / `BrandMark`.
 */
export function brandProvider(id: SocialProvider): AccountProvider {
  if (id === "instagram_w_facebook") return "instagram";
  // X's two OAuth flows are one brand; only the credential row differs, and
  // connected accounts are stored as `x` either way.
  if (id === "x_oauth2") return "x";
  return id;
}

/** Credentials-only provider ids carry no mark of their own: `instagram_w_facebook`
 * is Instagram authed through Facebook, and `x_oauth2` is X authed through OAuth
 * 2.0 — both keep their brand's glyph. */
function variantIcon(id: SocialProvider): BrandIcon {
  if (id === "instagram_w_facebook") return InstagramIcon;
  if (id === "x_oauth2") return BRAND_MARKS.x;
  return BRAND_MARKS[id];
}

function withIcons(brand: BrandSpec): BrandMeta {
  const { variants, ...base } = brand;
  return {
    ...base,
    icon: BRAND_MARKS[brand.id],
    variants: variants.map((variant) => ({
      ...variant,
      icon: variantIcon(variant.id),
    })),
  };
}

/** Every brand, in settings display order, with icons attached. */
export const PLATFORM_BRANDS: BrandMeta[] = BRAND_SPECS.map(withIcons);

/** Look up one brand by its base-platform id. */
export function brandMeta(id: OnboardingPlatform): BrandMeta | undefined {
  return PLATFORM_BRANDS.find((brand) => brand.id === id);
}

/** The brand that owns a provider — e.g. `tiktok_business` → the TikTok brand. */
export function providerBrand(id: SocialProvider): BrandMeta | undefined {
  return PLATFORM_BRANDS.find((brand) =>
    brand.variants.some((variant) => variant.id === id),
  );
}

/** The variant a brand writes when it's enabled with no further choices made. */
export function recommendedVariant(brand: BrandMeta): BrandVariant {
  return brand.variants.find((variant) => variant.recommended) ?? brand.variants[0];
}

/**
 * The base brands, in the onboarding "what do you post to" order. Onboarding and
 * the setup modal stay connection-type-agnostic ("TikTok"), so they read this
 * rather than the provider-level {@link ALL_PLATFORMS}.
 */
export const PLATFORMS: PlatformMeta[] = PLATFORM_BRANDS.map(
  ({ variants: _v, recommendationKey: _r, ...brand }) => brand,
);

/** Strip a variant down to plain provider metadata. */
function providerMeta(variant: BrandVariant): ProviderMeta {
  const { descriptionKey: _d, optionLabel: _o, recommended: _r, ...meta } = variant;
  return meta;
}

/**
 * Every social provider the product can connect (base brands + variants), as the
 * flat provider-level list that account rows, filters, and the account selector
 * look up by `social_provider` id. Base ids come first so the ordering matches
 * the brand list, with the alternate connection types appended.
 */
export const ALL_PLATFORMS: ProviderMeta[] = [
  ...PLATFORM_BRANDS.flatMap((brand) =>
    brand.variants.filter((v) => v.id === brand.id).map(providerMeta),
  ),
  ...PLATFORM_BRANDS.flatMap((brand) =>
    brand.variants.filter((v) => v.id !== brand.id).map(providerMeta),
  ),
];

/** Look up one provider's metadata by id (across the full provider set). */
export function platformMeta(id: SocialProvider): ProviderMeta | undefined {
  return ALL_PLATFORMS.find((platform) => platform.id === id);
}
