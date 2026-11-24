import { useTranslation } from "react-i18next";
import { useLoaderData } from "react-router";

import type { BillingSummary } from "~/lib/.server/stripe/billing-summary";

import { BillingButton } from "~/components/billing";
import { BillingIcon } from "~/icons";
import { Badge } from "~/ui/badge";
import { DATE_FORMAT, LocaleDateTime } from "~/ui/date-time";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";
import { Fact } from "~/ui/fact";
import { Separator } from "~/ui/separator";

import type { loader } from "./route.loader";

import { LegacyPlanIncludes } from "./components/legacy-plan-includes";
import { LegacyUpgradeCard } from "./components/legacy-upgrade-card";
import { MeteredUsageCard } from "./components/metered-usage-card";
import { PlanIncludes } from "./components/plan-includes";
import { SubscriptionActions } from "./components/subscription-actions";
import { UpcomingInvoiceCard } from "./components/upcoming-invoice-card";
import { UsageCard } from "./components/usage-card";

type Status = NonNullable<BillingSummary["subscription"]>["status"];

/**
 * TEMPORARY — force the legacy variant on so it can be reviewed without a
 * legacy customer to hand. Leave `false`; `plan.isLegacy` is now a real
 * declaration (`metadata.is_legacy`, PFM-946) rather than the old
 * "didn't match a current tier" inference, so this is only a review aid.
 */
const FORCE_LEGACY_VIEW = false;

/** Subscription status → badge tone. Everything that still grants access reads
 * `success`; a payment problem is the one state worth alarming about. */
const STATUS_VARIANT: Partial<
  Record<Status, React.ComponentProps<typeof Badge>["variant"]>
> = {
  active: "success-light",
  trialing: "success-light",
  past_due: "destructive-light",
  paused: "warning-light",
  incomplete: "warning-light",
};

export function Component() {
  const { t } = useTranslation();
  const { team, billing } = useLoaderData<typeof loader>();
  const { subscription, plan, usage, upcomingInvoice } = billing;
  /* Two questions, deliberately separate.
     `isLegacy` — DECLARED deprecated, so we ask them to upgrade.
     `metered`  — no current tier matched, so there's no allowance, price or
                  ladder position to render and the page falls back to the
                  metered shape.
     They coincide for every real plan today. They diverge on a product we
     don't recognize: render the shape that copes with a null limit, but don't
     tell someone their plan is obsolete when we simply can't classify it. */
  const isLegacy = FORCE_LEGACY_VIEW || Boolean(plan?.isLegacy);
  const metered = FORCE_LEGACY_VIEW || !plan?.hasTierData;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("billing.pageTitle")}
        </h1>
      </div>

      {subscription && plan ? (
        /* Left: what the subscription IS — facts, then the period's usage.
           Right: what you can do about it, and what it will cost. Reading down
           the left answers "where do I stand"; the right column is where you
           act, which is why the receipt sits under the actions rather than
           competing with the usage number for attention. */
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-6">
            {/* The plan IS the headline — name and status together, at a
                size that anchors the page. Everything under it is detail. The
                eyebrow names what the heading is, matching the label treatment
                used by `Fact` and the inclusions heading below. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                {t("billing.currentPlan")}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  {plan.name}
                </h2>
                <Badge
                  variant={STATUS_VARIANT[subscription.status] ?? "secondary"}
                >
                  {t(`billing.status.${subscription.status}`, {
                    defaultValue: subscription.status.replace(/_/g, " "),
                  })}
                </Badge>
                {plan.isLegacy ? (
                  <Badge variant="secondary">{t("billing.facts.legacy")}</Badge>
                ) : null}
              </div>
            </div>

            {/* Only the facts that vary per team and appear nowhere else. A
                renewal date is meaningless on a metered legacy plan, so it
                drops out there rather than showing a hollow row. */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:max-w-md">
              {metered ? null : subscription.cancelAt ? (
                <Fact label={t("billing.facts.cancelsOn")}>
                  <LocaleDateTime
                    value={subscription.cancelAt}
                    pattern={DATE_FORMAT}
                  />
                </Fact>
              ) : (
                <Fact label={t("billing.facts.renewsOn")}>
                  {subscription.currentPeriodEnd ? (
                    <LocaleDateTime
                      value={subscription.currentPeriodEnd}
                      pattern={DATE_FORMAT}
                    />
                  ) : (
                    "—"
                  )}
                </Fact>
              )}

              <Fact label={t("billing.facts.billingEmail")}>
                {billing.billingEmail ?? t("billing.facts.notSet")}
              </Fact>
            </dl>

            {metered ? (
              <LegacyPlanIncludes plan={plan} />
            ) : (
              <PlanIncludes plan={plan} />
            )}

            <Separator />

            {/* On a legacy plan the period's usage and the pitch share a row,
                50/50 — the pitch is an argument ABOUT that number, so sitting
                beside it beats being stacked a scroll below. `items-start` so
                the taller of the two doesn't stretch the other. Below `lg` it
                collapses to the natural reading order (usage, then pitch), and
                a non-legacy plan has no second cell, so the grid is a no-op. */}
            <div className="grid items-start gap-6 lg:grid-cols-2">
              {usage ? (
                /* Half the row only when the pitch is there to fill the other
                   half — otherwise usage spans it, so an unrecognized plan
                   (metered shape, no pitch) doesn't leave a hole. */
                <div className={isLegacy ? undefined : "lg:col-span-2"}>
                  {metered ? (
                    <MeteredUsageCard usage={usage} pricing={plan.meteredPricing} />
                  ) : (
                    <UsageCard usage={usage} />
                  )}
                </div>
              ) : null}

              {/* Upgrading is the only action it carries — managing the payment
                  method sits with the invoice in the aside. */}
              {isLegacy ? <LegacyUpgradeCard teamId={team.id} /> : null}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {isLegacy ? null : (
              <SubscriptionActions
                teamId={team.id}
                canUpgrade={plan.hasHigherTier}
                postLimit={plan.allowances.posts}
              />
            )}
            {/* On legacy, "Manage subscription" belongs to the receipt — it's
                the card that names the charge and the card being charged, so
                it's where you'd go to change either. It sits ABOVE the paper,
                where an action row normally leads a section: `Receipt` ends in
                a torn edge, so anything under it hangs off a tear. Grouped
                tight so the two read as one unit, and rendered whether or not
                there's an invoice to preview — the chore can't depend on Stripe
                having a preview to give. */}
            <div className="flex flex-col gap-3">
              {isLegacy ? (
                <div className="flex justify-end">
                  <BillingButton teamId={team.id} variant="secondary">
                    {t("billing.manage")}
                  </BillingButton>
                </div>
              ) : null}
              {upcomingInvoice ? (
                <UpcomingInvoiceCard
                  invoice={upcomingInvoice}
                  paymentMethod={billing.paymentMethod}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BillingIcon />
            </EmptyMedia>
            <EmptyTitle>{t("billing.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {t("billing.empty.description")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <BillingButton teamId={team.id}>
              {t("billing.empty.cta")}
            </BillingButton>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
