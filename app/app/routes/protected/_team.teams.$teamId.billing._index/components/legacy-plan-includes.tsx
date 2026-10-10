import { useTranslation } from "react-i18next";

import type { BillingSummary } from "~/lib/.server/stripe/billing-summary";

import { CheckIcon, CloseIcon } from "~/icons";
import { cn } from "~/lib/utils";

/**
 * What a LEGACY plan does and doesn't carry — the counterpart to
 * `PlanIncludes`, and shorter, because legacy included less.
 *
 * Unlike `PlanIncludes` this list is NOT included-only: Quickstart is the one
 * capability a legacy team can hold either way (legacy never bundled it, but the
 * Managed System Credentials add-on grants it), and "absent from the list"
 * reads as an oversight rather than an answer. So it always renders — as an
 * inclusion when the add-on is on the subscription, and as an explicit
 * exclusion when it isn't. That mixed list is why the heading here is neutral
 * ("Plan features") rather than `PlanIncludes`' "Included with your plan".
 *
 * The negation is carried by the STRING, not just the muted × — colour and
 * iconography alone shouldn't be the only thing saying "you don't have this".
 *
 * Feeds and post analytics still never appear: a legacy key is refused by both,
 * and their absence is the upgrade card's argument to make, not a row here.
 */
export function LegacyPlanIncludes({
  plan,
}: {
  plan: NonNullable<BillingSummary["plan"]>;
}) {
  const { t } = useTranslation();

  const items: { included: boolean; label: string }[] = [
    { included: true, label: t("billing.includes.whiteLabel") },
    { included: true, label: t("billing.includes.accountsUnlimited") },
    plan.hasManagedCredentialsAddon
      ? { included: true, label: t("billing.includes.quickstart") }
      : { included: false, label: t("billing.includes.quickstartNone") },
  ];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {t("billing.includes.featuresTitle")}
      </h2>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map(({ included, label }) => (
          <li
            key={label}
            className={cn(
              "flex items-start gap-2 text-sm",
              included ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {included ? (
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <CloseIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
