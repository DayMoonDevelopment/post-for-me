import { useTranslation } from "react-i18next";

import {
  SetupScreen,
  SetupScreenBody,
  SetupScreenHeader,
} from "~/components/setup-screen";
import { SocialAccountsIcon } from "~/icons";
import { PLATFORM_LABELS, PLATFORM_ORDER } from "~/lib/post-for-me.utils";
import { BrandMark } from "~/ui/brand-mark";
import { Button } from "~/ui/button";

/**
 * The display-neutral content of the "connect a social account" action. This is
 * the modular piece the launchpad guided-tour consumes directly (wrapped in a
 * carousel slide) and that {@link ConnectAccountDialog} wraps in a standalone
 * modal. It owns no frame — see `setup-screen` for why.
 *
 * Body is the platform picker: every provider we support, in a single-column
 * scrolling list (`SetupScreenBody` is the scroll region) so the longer provider
 * labels fit. Selecting one will
 * kick off that platform's OAuth hand-off (PFM-696) — the tiles just present
 * the choices until that lands.
 */
export function ConnectAccountContent() {
  const { t } = useTranslation();
  return (
    <SetupScreen data-slot="connect-account-content">
      <SetupScreenHeader
        icon={<SocialAccountsIcon />}
        title={t("setup.connectAccount.title")}
      />
      <SetupScreenBody>
        <div className="grid gap-2">
          {PLATFORM_ORDER.map((platform) => (
            <Button
              key={platform}
              type="button"
              variant="outline"
              className="h-auto justify-start gap-2.5 px-3 py-2.5 text-sm font-normal"
            >
              <BrandMark platform={platform} className="size-5 shrink-0" />
              <span className="truncate">{PLATFORM_LABELS[platform]}</span>
            </Button>
          ))}
        </div>
      </SetupScreenBody>
    </SetupScreen>
  );
}
