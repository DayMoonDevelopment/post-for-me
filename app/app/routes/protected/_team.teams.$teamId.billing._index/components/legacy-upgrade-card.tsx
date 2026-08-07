import { useTranslation } from "react-i18next";

import { BillingPlansDialog } from "~/components/billing";
import { CheckIcon } from "~/icons";
import { Separator } from "~/ui/separator";

/**
 * The upgrade pitch — half of the row it shares with the period's usage, and
 * the last thing in the main column.
 *
 * It sits BESIDE the usage rather than above it: the pitch only lands once you
 * know what the period is costing you, so it reads as the answer to that
 * number rather than competing with it for the top of the page. Below `lg` the
 * row collapses and the same order holds vertically.
 *
 * Tinted with `--pop` so it reads as the one promotional surface on an
 * otherwise factual page: everything else here reports the account's state,
 * this one is selling. The feature list comes from the SAME i18n key the plan
 * picker's summary uses (`setup.billing.plans.features`), so the promise made
 * here and the promise made at checkout can't drift apart — including the two
 * entries that name white label and Quickstart projects outright, which are
 * exactly what `LegacyPlanIncludes` reports the legacy plan as lacking.
 *
 * The CTA sits in the HEADER rather than in a trailing action row, which had
 * put the one action the surface exists for at the far bottom-right, a diagonal
 * away from the sentence arguing for it. Managing the payment method is NOT
 * here — that's a chore, not a pitch, and it lives with the invoice in the
 * aside.
 *
 * `upgrade` mode means Continue switches the plan in place, since a paying
 * customer has no card left for Checkout to collect.
 */
export function LegacyUpgradeCard({ teamId }: { teamId: string }) {
  const { t } = useTranslation();

  const features = t("setup.billing.plans.features", {
    returnObjects: true,
  }) as unknown as string[];

  return (
    /* A CONTAINER, not viewport breakpoints: this card is a third of the row on
       a wide screen and the full width of the page on a narrow one, so "is
       there room for two columns" is a question about the card, not the
       window. `sm:` would have given it two columns at its narrowest. */
    <section className="@container flex flex-col gap-4 rounded-xl border border-pop/20 bg-pop/5 p-6 dark:bg-pop/10">
      <div className="flex flex-col items-stretch gap-3 @md:flex-row @md:items-start @md:justify-between @md:gap-x-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-heading text-base font-semibold text-foreground">
            {t("billing.legacy.upsell.title")}
          </h2>
          <p className="text-sm/relaxed text-balance text-muted-foreground">
            {t("billing.legacy.upsell.description")}
          </p>
        </div>
        {/* No `currentPostLimit`: a legacy plan has no allowance to compare
            against, so every tier is selectable. */}
        <BillingPlansDialog
          teamId={teamId}
          mode="upgrade"
          label={t("billing.legacy.upsell.cta")}
          className="w-full shrink-0 @md:w-auto"
        />
      </div>

      <Separator className="bg-pop/15" />

      {/* Two columns only when the CARD is wide (stacked layout, or tablet) —
          a single stack of seven bullets across a full-width card is a long
          thin ribbon of text, but so is two columns inside a third of a row. */}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-2 @xl:grid-cols-2">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-foreground"
          >
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
