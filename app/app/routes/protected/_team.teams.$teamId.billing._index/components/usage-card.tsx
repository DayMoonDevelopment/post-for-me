import { useTranslation } from "react-i18next";

import type { BillingSummary } from "~/lib/.server/stripe/billing-summary";

import { cn } from "~/lib/utils";
import { Badge } from "~/ui/badge";
import { DATE_FORMAT, LocaleDateTime } from "~/ui/date-time";

/** Where the meter turns from information into a warning. */
const WARN_AT = 0.8;

/**
 * Metered posts for the current billing period, against the plan's allowance.
 *
 * The bar is the point of the card, so it earns its border. Tone escalates with
 * consumption — neutral, then `warning` past 80%, then `destructive` at the
 * limit — because "you are about to be cut off" is the one thing a user needs
 * to see without reading numbers.
 */
export function UsageCard({ usage }: { usage: NonNullable<BillingSummary["usage"]> }) {
  const { t } = useTranslation();
  const { used, limit } = usage;

  const ratio = limit && limit > 0 ? used / limit : null;
  const over = ratio != null && ratio >= 1;
  const warning = ratio != null && ratio >= WARN_AT && !over;
  const percent = ratio == null ? null : Math.min(Math.round(ratio * 100), 100);

  return (
    <section className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            {t("billing.usage.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            <LocaleDateTime value={usage.periodStart} pattern={DATE_FORMAT} />
            {" – "}
            <LocaleDateTime value={usage.periodEnd} pattern={DATE_FORMAT} />
          </p>
        </div>
        {over ? (
          <Badge variant="destructive-light">{t("billing.usage.overLimit")}</Badge>
        ) : warning ? (
          <Badge variant="warning-light">
            {t("billing.usage.approaching", { percent })}
          </Badge>
        ) : null}
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span
          className={cn(
            "font-heading text-3xl font-semibold tabular-nums",
            over
              ? "text-destructive-foreground"
              : warning
                ? "text-warning-foreground"
                : "text-foreground",
          )}
        >
          {t("billing.usage.postsUsed", { count: used })}
        </span>
        <span className="text-sm text-muted-foreground">
          {limit == null
            ? t("billing.usage.postsNoLimit")
            : t("billing.usage.postsOfLimit", { limit })}
        </span>
      </div>

      {percent == null ? null : (
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("billing.usage.title")}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              over ? "bg-destructive" : warning ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </section>
  );
}
