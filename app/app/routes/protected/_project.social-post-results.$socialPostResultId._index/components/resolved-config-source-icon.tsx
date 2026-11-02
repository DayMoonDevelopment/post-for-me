import { useTranslation } from "react-i18next";

import type { SocialProvider } from "~/lib/onboarding";
import type { ConfigSource } from "~/lib/types/social-post-result";

import { GlobeIcon, SocialAccountsIcon } from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

/**
 * The cascade layer a resolved value came from, as a small icon + tooltip: a
 * globe (global / the post), the platform's brand mark, or the account glyph.
 */
export function SourceIcon({
  source,
  platform,
}: {
  platform: SocialProvider;
  source: ConfigSource;
}) {
  const { t } = useTranslation();
  const meta = platformMeta(platform);
  const Icon =
    source === "global"
      ? GlobeIcon
      : source === "platform"
        ? (meta?.icon ?? SocialAccountsIcon)
        : SocialAccountsIcon;
  const tip =
    source === "platform"
      ? t("socialPostResults.source.platform", {
          platform: meta?.label ?? platform,
        })
      : t(`socialPostResults.source.${source}`);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex text-muted-foreground"
            aria-label={tip}
            role="img"
          >
            <Icon className="size-4" />
          </span>
        }
      />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
