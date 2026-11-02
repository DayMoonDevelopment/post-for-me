import type { TranslationContentKey, TranslationKey } from "~/lib/i18n/config";
import type { OnboardingPlatform, SocialProvider } from "~/lib/onboarding";

/**
 * The BRAND topology: which `social_provider` rows sit behind each platform a
 * user recognizes, and which one we steer toward.
 *
 * Like `~/lib/onboarding`, this module is intentionally free of React and
 * `.server`-only imports so the settings ACTION and the client components can
 * share one definition. Icons live in `~/lib/platform-meta`, which layers them
 * on top — a server action has no business importing the SVG registry.
 *
 * The shape exists because enablement is stored per `social_provider` while
 * people think in brands: Instagram and TikTok each connect through two
 * different developer apps, so each spans two rows.
 */

/** ONE way a brand can be connected, mapped to the row that backs it. */
export type BrandVariantSpec = {
  /** i18n key for what this method actually does — every method in a multi-method
   * brand carries one, so each choice explains itself rather than only the
   * non-recommended ones carrying a caveat. Absent on single-method brands,
   * which never render a chooser. */
  descriptionKey?: TranslationKey;
  /** The `social_provider` row this variant reads/writes. */
  id: SocialProvider;
  /** Provider-level label, as used in account lists ("TikTok (Business API)"). */
  label: string;
  /** Short label for the variant control ("Business API"). */
  optionLabel: string;
  /** Exactly one variant per brand carries this: what enabling the brand writes. */
  recommended?: boolean;
  /** See {@link BrandSpec.requiresKeys}. */
  requiresKeys?: boolean;
};

export type BrandSpec = {
  id: OnboardingPlatform;
  label: string;
  /** i18n key for OUR recommendation between this brand's methods, revealed by
   * the "Which should I use?" hint. Only set where there's a choice to make. */
  recommendationKey?: TranslationContentKey;
  /**
   * Whether a white-label project must supply its own developer app id/secret
   * for this platform. Defaults to `true` — omit it unless the platform is the
   * exception. Bluesky is: it authenticates per-account with a handle + app
   * password the ACCOUNT OWNER creates, so there is no project-level developer
   * app to register and enabling it is the whole setup.
   */
  requiresKeys?: boolean;
  /** Connection methods, RECOMMENDED FIRST. Always at least one. */
  variants: BrandVariantSpec[];
};

/** A brand whose only connection method is the brand itself — the common case. */
function single(
  id: OnboardingPlatform,
  label: string,
  requiresKeys?: boolean,
): BrandSpec {
  const keys = requiresKeys === false ? { requiresKeys } : {};
  return {
    id,
    label,
    ...keys,
    variants: [{ id, label, optionLabel: label, recommended: true, ...keys }],
  };
}

/**
 * Every brand the product can connect, in the order the settings page lists
 * them — deliberate, not alphabetical, which would split Instagram and TikTok
 * apart from their own connection methods.
 */
export const BRAND_SPECS: BrandSpec[] = [
  {
    id: "instagram",
    label: "Instagram",
    recommendationKey: "projectSettings.platforms.recommendation.instagram",
    variants: [
      {
        id: "instagram",
        label: "Instagram",
        optionLabel: "Instagram Login",
        descriptionKey: "projectSettings.platforms.variants.instagram",
        recommended: true,
      },
      {
        id: "instagram_w_facebook",
        label: "Instagram (w/ Facebook Login)",
        optionLabel: "Facebook Login",
        descriptionKey: "projectSettings.platforms.variants.instagramWFacebook",
      },
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    recommendationKey: "projectSettings.platforms.recommendation.tiktok",
    variants: [
      {
        id: "tiktok_business",
        label: "TikTok (Business API)",
        optionLabel: "Business API",
        descriptionKey: "projectSettings.platforms.variants.tiktokBusiness",
        recommended: true,
      },
      {
        id: "tiktok",
        label: "TikTok (Standard API)",
        optionLabel: "Standard API",
        descriptionKey: "projectSettings.platforms.variants.tiktokStandard",
      },
    ],
  },
  single("youtube", "YouTube"),
  {
    id: "x",
    label: "X (Twitter)",
    recommendationKey: "projectSettings.platforms.recommendation.x",
    variants: [
      {
        id: "x_oauth2",
        label: "X (Twitter) OAuth 2.0",
        optionLabel: "OAuth 2.0",
        descriptionKey: "projectSettings.platforms.variants.xOauth2",
        recommended: true,
      },
      {
        // NOTE the label stays the plain brand name: connected X accounts are
        // stored as provider `x` WHATEVER flow authorized them (the flavour
        // lives in `social_provider_metadata.connection_type`), so this is the
        // string every X account row renders. Calling it "OAuth 1.0" here would
        // mislabel every OAuth 2.0 account in the product.
        id: "x",
        label: "X (Twitter)",
        optionLabel: "OAuth 1.0a",
        descriptionKey: "projectSettings.platforms.variants.xOauth1",
      },
    ],
  },
  single("facebook", "Facebook"),
  single("linkedin", "LinkedIn"),
  single("pinterest", "Pinterest"),
  single("threads", "Threads"),
  single("bluesky", "Bluesky", false),
];

/** The variant a brand writes when it's enabled with no further choices made. */
export function recommendedVariantSpec(brand: BrandSpec): BrandVariantSpec {
  return brand.variants.find((variant) => variant.recommended) ?? brand.variants[0];
}

/** Look up one brand by its base-platform id. */
export function brandSpec(id: string): BrandSpec | undefined {
  return BRAND_SPECS.find((brand) => brand.id === id);
}

/** Every `social_provider` row a brand owns. */
export function brandProviders(brand: BrandSpec): SocialProvider[] {
  return brand.variants.map((variant) => variant.id);
}
