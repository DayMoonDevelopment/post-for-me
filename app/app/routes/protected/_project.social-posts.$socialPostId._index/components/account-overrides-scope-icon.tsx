import { useTranslation } from "react-i18next";

import type { SocialProvider } from "~/lib/onboarding";
import type { ConfigScope } from "~/lib/types/social-post";

import { SocialAccountsIcon } from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

/**
 * The cascade level an override came from, as a small icon + tooltip: the
 * platform's brand mark for platform-wide overrides, the account glyph for
 * account-specific ones.
 */
export function ScopeIcon({
  scope,
  platform,
}: {
  platform: SocialProvider;
  scope: ConfigScope;
}) {
  const { t } = useTranslation();
  const meta = platformMeta(platform);
  const Icon =
    scope === "platform"
      ? (meta?.icon ?? SocialAccountsIcon)
      : SocialAccountsIcon;
  const tip =
    scope === "platform"
      ? t("socialPosts.detail.scopeTooltip.platform", {
          platform: meta?.label ?? platform,
        })
      : t("socialPosts.detail.scopeTooltip.account");

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
