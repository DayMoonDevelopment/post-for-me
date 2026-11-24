import { useTranslation } from "react-i18next";

import type { BillingSummary } from "~/lib/.server/stripe/billing-summary";

import { CheckIcon } from "~/icons";

/**
 * What the plan includes, as a checklist rather than label→value facts.
 *
 * Every one of these used to be a `Fact` whose value was the word "Included" or
 * "Unlimited" — five pairs carrying one bit each, which read as dense while
 * saying almost nothing. A check and a phrase says the same thing in half the
 * space and lets the eye skim it as a set.
 *
 * Only what's INCLUDED is listed. An absence isn't a fact worth a row here; the
 * upgrade card is where a missing capability does useful work. Counts appear
 * when a plan actually caps something — the phrasing carries the number, so
 * there's still no separate label.
 *
 * Post limit is deliberately absent: the usage card is about that number, and
 * the receipt restates it. Three copies on one page was the worst of the
 * redundancy.
 */
export function PlanIncludes({
  plan,
}: {
  plan: NonNullable<BillingSummary["plan"]>;
}) {
  const { t } = useTranslation();
  const { allowances } = plan;

  const items = [
    plan.includesSystemCredentials ? t("billing.includes.quickstart") : null,
    t("billing.includes.whiteLabel"),
    allowances.socialAccounts == null
      ? t("billing.includes.accountsUnlimited")
      : t("billing.includes.accountsCount", {
          count: allowances.socialAccounts,
        }),
    plan.includesFeeds ? t("billing.includes.feeds") : null,
    plan.includesFeeds ? t("billing.includes.analytics") : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {t("billing.includes.title")}
      </h2>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
