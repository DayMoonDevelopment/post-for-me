import type { TFunction } from "i18next";

import { useTranslation } from "react-i18next";

import type { SocialProvider } from "~/lib/onboarding";
import type { PostAccountOverride } from "~/lib/types/social-post";

import { humanizeKey } from "~/lib/humanize";

import { ScopeIcon } from "./account-overrides-scope-icon";
import { OverrideValue } from "./account-overrides-value";

/** Field label: caption/media reuse the section titles; provider_data keys are
 * humanized. */
function fieldLabel(field: string, t: TFunction): string {
  if (field === "caption") return t("socialPosts.detail.captionTitle");
  if (field === "media") return t("socialPosts.detail.mediaTitle");
  return humanizeKey(field);
}

/**
 * The expanded "custom configuration" list for an account: a row per overridden
 * field (scope icon + label → resolved value), shown when its account row's
 * disclosure is open.
 */
export function CustomConfigList({
  overrides,
  platform,
}: {
  overrides: PostAccountOverride[];
  platform: SocialProvider;
}) {
  const { t } = useTranslation();
  return (
    <dl className="flex flex-col gap-2.5 ps-5">
      {overrides.map((override) => (
        <div
          key={override.field}
          className="grid grid-cols-[11rem_1fr] items-baseline gap-4"
        >
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ScopeIcon scope={override.scope} platform={platform} />
            <span>{fieldLabel(override.field, t)}</span>
          </dt>
          <dd className="min-w-0 text-sm text-foreground">
            <OverrideValue override={override} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
