import type { TFunction } from "i18next";

import { useTranslation } from "react-i18next";

import type {
  BillingSummary,
  MeteredPricing,
} from "~/lib/.server/stripe/billing-summary";

import { DATE_FORMAT, LocaleDateTime } from "~/ui/date-time";

/**
 * Per-value options for i18next's `currency` formatter.
 *
 * The formatting itself happens inside the translation string
 * (`{{amount, currency}}`) so the number uses the ACTIVE language, not the
 * browser's system locale — see the `i18n` skill, Rule 1. Only the options
 * travel from here, via `formatParams`.
 */
function moneyParams(amount: number, currency: string) {
  return {
    currency,
    // Sub-cent rates are the norm here ($0.005/post); don't round them to zero.
    minimumFractionDigits: 2,
    maximumFractionDigits: amount > 0 && amount < 0.01 ? 4 : 2,
  };
}

/** "Up to 50", "51 – 100", "101+" — the band a tier covers, derived from the
 * previous tier's ceiling since Stripe only gives each tier its `up_to`. */
function bandLabel(
  tiers: MeteredPricing["tiers"],
  index: number,
  t: TFunction,
): string {
  const from = index === 0 ? 1 : (tiers[index - 1]?.upTo ?? 0) + 1;
  const to = tiers[index]?.upTo;
  if (to == null) return t("billing.legacy.tierFrom", { from });
  if (from === 1) return t("billing.legacy.tierUpTo", { to });
  return t("billing.legacy.tierRange", { from, to });
}

/**
 * Usage on a LEGACY (metered) plan.
 *
 * Deliberately NOT the tier usage card with the bar removed. There is no cap to
 * fill, so a progress bar would be meaningless; the question a pay-per-post
 * customer has is "what is this costing me?", so the count is presented as the
 * driver of the bill, with the authoritative amount left to the upcoming
 * invoice beside it.
 *
 * Pricing renders in whichever shape the price actually is — a flat rate, or
 * the real tier bands. Collapsing tiers into one "effective rate" would be a
 * number we invented that appears on no invoice.
 *
 * The bands are shown WITHOUT a note explaining how they combine, so graduated
 * and volume pricing read identically here; the invoice beside them is the
 * authority on the amount either way.
 */
export function MeteredUsageCard({
  pricing,
  usage,
}: {
  pricing: NonNullable<BillingSummary["plan"]>["meteredPricing"];
  usage: NonNullable<BillingSummary["usage"]>;
}) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col">
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

      <div className="mt-5 flex items-baseline gap-2">
        <span className="font-heading text-3xl font-semibold tabular-nums text-foreground">
          {t("billing.usage.postsUsed", { count: usage.used })}
        </span>
        <span className="text-sm text-muted-foreground">
          {t("billing.legacy.postsBilled")}
        </span>
      </div>

      {pricing?.mode === "per_unit" && pricing.unitAmount != null ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-foreground">
            {t("billing.legacy.ratePerPost", {
  amount: pricing.unitAmount,
  formatParams: { amount: moneyParams(pricing.unitAmount, pricing.currency) },
})}
          </span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span className="text-muted-foreground">{t("billing.legacy.noCap")}</span>
        </div>
      ) : pricing && pricing.tiers.length > 0 ? (
        <dl className="mt-4 flex flex-col gap-1">
          {pricing.tiers.map((tier, index) => (
            <div
              key={`${tier.upTo ?? "inf"}-${index}`}
              className="flex items-baseline justify-between gap-4 text-sm"
            >
              <dt className="text-muted-foreground">
                {bandLabel(pricing.tiers, index, t)}
              </dt>
              <dd className="tabular-nums text-foreground">
                {tier.unitAmount === 0
                  ? t("billing.legacy.tierFree")
                  : t("billing.legacy.tierRate", {
   amount: tier.unitAmount,
   formatParams: { amount: moneyParams(tier.unitAmount, pricing.currency) },
 })}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("billing.legacy.noCap")}
        </p>
      )}
    </section>
  );
}
