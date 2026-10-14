import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import type { loader as previewLoader } from "~/routes/protected/api.teams.$teamId.upgrade-preview._index/route.loader";

import { ArrowRightIcon } from "~/icons";
import { DATE_FORMAT, LocaleDateTime } from "~/ui/date-time";
import { Separator } from "~/ui/separator";
import { Skeleton } from "~/ui/skeleton";

/** A bare amount (no surrounding sentence), so Intl is fine here — but it must
 * be bound to the ACTIVE language. `undefined` would use the operating system's
 * locale, which drifts from the rendered copy. See the `i18n` skill, Rule 1. */
function money(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
}

/**
 * The confirmation STEP of an in-app plan change — display only. Stepping and
 * committing belong to the carousel's nav in the dialog footer, so this renders
 * what the change costs and nothing else.
 *
 * Everything shown is priced by Stripe with the SAME parameters the commit
 * uses, so the quote can't disagree with the invoice. Two amounts, because the
 * anchor-reset model produces two: what's collected now (any arrears plus the
 * new plan's first month) and what recurs afterward.
 *
 * The preview is fetched when the step becomes ACTIVE rather than on mount —
 * the carousel mounts every slide up front, and pricing on each radio click
 * would be a Stripe round-trip per keystroke of indecision.
 */
export function BillingUpgradeConfirm({
  active,
  priceId,
  teamId,
}: {
  active: boolean;
  priceId: null | string;
  teamId: string;
}) {
  const { i18n, t } = useTranslation();
  const preview = useFetcher<typeof previewLoader>();

  const load = preview.load;
  React.useEffect(() => {
    if (!active || !priceId) return;
    load(
      `/api/teams/${teamId}/upgrade-preview?price=${encodeURIComponent(priceId)}`,
    );
  }, [active, load, teamId, priceId]);

  const data = preview.data?.preview ?? null;

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Old → new, side by side: the change itself, before its cost. */}
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            {t("billing.confirm.from")}
          </span>
          <span className="truncate text-sm text-foreground">
            {data.current?.name ?? t("billing.confirm.noPlan")}
          </span>
          {data.current?.amount != null ? (
            <span className="text-xs text-muted-foreground">
              {money(data.current.amount, data.currency, i18n.language)}
              {t("setup.billing.plans.permo")}
            </span>
          ) : null}
        </div>

        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            {t("billing.confirm.to")}
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            {data.next.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {money(data.next.amount, data.currency, i18n.language)}
            {t("setup.billing.plans.permo")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium text-foreground">
            {t("billing.confirm.today")}
          </span>
          <span className="font-heading text-lg font-semibold tabular-nums text-foreground">
            {money(data.chargedToday, data.currency, i18n.language)}
          </span>
        </div>

        {/* Stripe's own itemization of that number. */}
        <ul className="flex flex-col gap-1.5">
          {data.lines.map((line, index) => (
            <li
              key={`${line.description}-${index}`}
              className="flex items-baseline justify-between gap-4 text-xs text-muted-foreground"
            >
              <span className="min-w-0">{line.description}</span>
              <span className="shrink-0 tabular-nums">
                {money(line.amount, data.currency, i18n.language)}
              </span>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {data.renewsOn ? (
              <>
                {t("billing.confirm.thenOn")}{" "}
                <LocaleDateTime
                  className="text-foreground"
                  value={data.renewsOn}
                  pattern={DATE_FORMAT}
                />
              </>
            ) : (
              t("billing.confirm.then")
            )}
          </span>
          <span className="text-sm tabular-nums text-foreground">
            {money(data.renewalAmount, data.currency, i18n.language)}
          </span>
        </div>
      </div>
    </div>
  );
}
