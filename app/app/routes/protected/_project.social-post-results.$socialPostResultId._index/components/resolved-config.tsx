import type { TFunction } from "i18next";

import { useTranslation } from "react-i18next";

import type { SocialProvider } from "~/lib/onboarding";
import type { ResolvedConfigField } from "~/lib/types/social-post-result";

import { humanizeKey } from "~/lib/humanize";

import { SourceIcon } from "./resolved-config-source-icon";
import { ResolvedValue } from "./resolved-config-value";

/** Field label: caption/media reuse the section titles; provider_data keys are
 * humanized. */
function fieldLabel(field: string, t: TFunction): string {
  if (field === "caption") return t("socialPosts.detail.captionTitle");
  if (field === "media") return t("socialPosts.detail.mediaTitle");
  return humanizeKey(field);
}

/**
 * The account's fully-resolved configuration — the cascade collapsed into the
 * values actually used, each field tagged with the layer (global / platform /
 * account) it resolved from.
 */
export function ResolvedConfig({
  resolved,
  platform,
}: {
  platform: SocialProvider;
  resolved: ResolvedConfigField[];
}) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-sm font-semibold text-foreground">
        {t("socialPostResults.configurationTitle")}
      </h2>
      <dl className="flex flex-col gap-3">
        {resolved.map((field) => (
          <div
            key={field.field}
            className="grid grid-cols-[11rem_1fr] items-baseline gap-4"
          >
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <SourceIcon source={field.source} platform={platform} />
              <span>{fieldLabel(field.field, t)}</span>
            </dt>
            <dd className="min-w-0 text-sm text-foreground">
              <ResolvedValue field={field} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
