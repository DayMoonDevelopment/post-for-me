import type { TFunction } from "i18next";
import type { ComponentType } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { SocialProvider } from "~/lib/onboarding";
import type {
  ConnectionResultAccount,
  ConnectionResultData,
} from "~/lib/types/connection-result";

import { SocialAccountAvatar } from "~/components/social-account-avatar";
import {
  ExternalLinkIcon,
  PostForMeWordmark,
  SuccessIcon,
  WarningIcon,
} from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { cn } from "~/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";

/**
 * The Post for Me-branded OAuth result fallback, shared by both callback routes
 * (White Label + Quickstart). Shown only when the project has no
 * `auth_callback_url`; the data is produced by a real, `state`-gated exchange, so
 * this surface can't be conjured by hand (a manual hit falls through to failure).
 * Success / failure only — there is no free-floating page to fake.
 */
export function ConnectionResult({ data }: { data: ConnectionResultData }) {
  const { t } = useTranslation();
  const { tone, Icon, title, description } = statusHeader(data, t);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted p-6 md:p-10">
      <PostForMeWordmark className="h-6" />

      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-5 py-2 text-center">
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-full",
              TONE_ICON[tone],
            )}
          >
            <Icon className="size-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-heading text-lg font-semibold text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {data.isSuccess ? (
            <div className="flex w-full flex-col gap-2">
              {data.accounts.map((account, index) => (
                <AccountReference key={index} account={account} />
              ))}
            </div>
          ) : null}

          {data.isSuccess && data.failedCount > 0 ? (
            <Alert variant="warning" className="text-start">
              <WarningIcon />
              <AlertTitle>
                {t("connectionResult.partialTitle", {
                  count: data.failedCount,
                })}
              </AlertTitle>
              <AlertDescription>
                {t("connectionResult.partialDescription")}
              </AlertDescription>
            </Alert>
          ) : null}

          {!data.isSuccess ? (
            <Alert variant="destructive" className="text-start">
              <WarningIcon />
              <AlertTitle>{t("connectionResult.errorTitle")}</AlertTitle>
              <AlertDescription>
                {data.errorMessages.length > 0
                  ? data.errorMessages.join(" · ")
                  : t("connectionResult.errorFallback")}
              </AlertDescription>
            </Alert>
          ) : null}

          {data.canOpenDashboard && data.dashboardHref ? (
            <Button
              size="lg"
              className="w-full"
              render={<Link to={data.dashboardHref} />}
            >
              {t("connectionResult.openDashboard")}
              <ExternalLinkIcon />
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

type Tone = "success" | "destructive";

/** Tone → the circular status-icon treatment. One map, no per-branch styling. */
const TONE_ICON: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
};

interface StatusHeader {
  description: string;
  Icon: ComponentType<{ className?: string }>;
  title: string;
  tone: Tone;
}

/** Derive the header (icon + copy) for the outcome. A plain function with early
 * returns — not nested ternaries in JSX. Takes `t` rather than calling the hook,
 * so it stays a pure function of its inputs. */
function statusHeader(
  data: ConnectionResultData,
  t: TFunction,
): StatusHeader {
  const platform =
    platformMeta(data.provider as SocialProvider)?.label ||
    t("connectionResult.providerFallback");

  if (data.isSuccess) {
    // `count` drives i18next's plural selection — singular vs plural copy is the
    // locale's business, not a `> 1` ternary here (not every language splits at
    // one).
    const count = data.accounts.length;
    return {
      tone: "success",
      Icon: SuccessIcon,
      title: t("connectionResult.successTitle", { count }),
      description: t("connectionResult.successDescription", {
        count,
        platform,
      }),
    };
  }

  return {
    tone: "destructive",
    Icon: WarningIcon,
    title: t("connectionResult.failedTitle"),
    description: t("connectionResult.failedDescription", { platform }),
  };
}

/** The visual reference to one connected account: avatar (with a health dot),
 * display name/handle, and platform. */
function AccountReference({ account }: { account: ConnectionResultAccount }) {
  const meta = platformMeta(account.platform);
  const PlatformIcon = meta?.icon;
  const label = account.username ?? meta?.label ?? account.platform;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/5">
      <SocialAccountAvatar account={account} size="lg" ringClassName="ring-card" />
      <div className="min-w-0 flex-1 text-start">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {PlatformIcon ? <PlatformIcon className="size-3" /> : null}
          <span className="truncate">{meta?.label ?? account.platform}</span>
        </p>
      </div>
    </div>
  );
}
