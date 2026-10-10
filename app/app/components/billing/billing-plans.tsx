import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import type { loader as pricingLoader } from "~/routes/protected/api.pricing._index/route.loader";

import { CheckIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
  ChoiceboxItemDescription,
  ChoiceboxItemIndicator,
  ChoiceboxItemTitle,
} from "~/ui/choicebox";
import { Skeleton } from "~/ui/skeleton";
import { Spinner } from "~/ui/spinner";

import { BillingButton } from "./billing-button";

type Tier = Awaited<ReturnType<typeof pricingLoader>>["tiers"][number];

/** Per-value options for i18next's `currency` formatter. The formatting itself
 * happens in the `pricePerMonth` key so the amount uses the ACTIVE language, and
 * so "/mo" stays part of one translatable sentence instead of being concatenated
 * onto a pre-formatted string. `maximumFractionDigits: 0` keeps whole-dollar
 * plans reading as "$29", not "$29.00"; a tier priced with cents still shows them. */
/** The headline price rendered on its own, with the "/mo" suffix styled
 * separately beside it — a bare value, not a sentence, so Intl is appropriate.
 * Bound to the ACTIVE language, never the OS locale. */
function formatPrice(tier: Tier, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    ...priceParams(tier),
  }).format(tier.price);
}

function priceParams(tier: Tier) {
  return {
    currency: tier.currency,
    maximumFractionDigits: Number.isInteger(tier.price) ? 0 : 2,
  };
}

/** The recommended default selection — smallest tier covering the expected
 * volume, else the largest, else the first. Mirrors `recommendedTier` (which is
 * server-only); tiers arrive sorted ascending by post limit. */
function recommend(tiers: Tier[], volume: number | null): Tier | null {
  if (tiers.length === 0) return null;
  if (volume != null && Number.isFinite(volume)) {
    return tiers.find((t) => t.postLimit >= volume) ?? tiers[tiers.length - 1];
  }
  return tiers[0];
}

/**
 * The plan-selection surface, as a compound family so the picker, the value-prop
 * summary, and the Continue button can each live in a different region of the
 * host {@link ~/components/modal Modal} (tiers in a column, summary in the muted
 * aside, Continue pinned in the footer) — and still stack inline in the narrow
 * onboarding slide. `BillingPlans` is the provider: it lazily fetches the tiers
 * from `/api/pricing` (so listing Stripe products never hits a normal page) and
 * holds the selection; the parts read {@link useBillingPlans}.
 */
type BillingPlansContextValue = {
  currentPostLimit?: null | number;
  loading: boolean;
  selected: Tier | null;
  selectedPriceId: string | null;
  setSelectedPriceId: (id: string) => void;
  teamId?: string | null;
  tiers: Tier[];
  volume?: string | number | null;
};

const BillingPlansContext =
  React.createContext<BillingPlansContextValue | null>(null);

export function useBillingPlans() {
  const ctx = React.useContext(BillingPlansContext);
  if (!ctx) {
    throw new Error("useBillingPlans must be used within <BillingPlans>");
  }
  return ctx;
}

export function BillingPlans({
  teamId,
  volume,
  currentPostLimit,
  children,
}: {
  children: React.ReactNode;
  /** The current plan's post allowance. Every tier is still SHOWN — the ladder
   * is easier to read whole — but the current one is marked and anything at or
   * below it is disabled, so a downgrade can't be selected. Omit for a new
   * customer, or a legacy plan with no allowance to compare against. */
  currentPostLimit?: null | number;
  teamId?: string | null;
  volume?: string | number | null;
}) {
  const fetcher = useFetcher<typeof pricingLoader>();

  React.useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) fetcher.load("/api/pricing");
  }, [fetcher]);

  const tiers = React.useMemo<Tier[]>(
    () => fetcher.data?.tiers ?? [],
    [fetcher.data],
  );
  const volumeNum = volume != null ? Number(volume) : null;
  // Only tiers above the current one can be chosen, so the default has to come
  // from those — otherwise the picker opens pre-selected on a disabled row.
  const selectable = React.useMemo(
    () =>
      currentPostLimit == null
        ? tiers
        : tiers.filter((tier) => tier.postLimit > currentPostLimit),
    [tiers, currentPostLimit],
  );
  const defaultPriceId = React.useMemo(
    () => recommend(selectable, volumeNum)?.priceId ?? null,
    [selectable, volumeNum],
  );
  const [selectedPriceId, setSelectedPriceId] = React.useState<string | null>(
    null,
  );

  // Seed the selection once tiers arrive (recommended tier).
  React.useEffect(() => {
    if (!selectedPriceId && defaultPriceId) setSelectedPriceId(defaultPriceId);
  }, [defaultPriceId, selectedPriceId]);

  const selected =
    tiers.find((tier) => tier.priceId === selectedPriceId) ?? null;

  return (
    <BillingPlansContext.Provider
      value={{
        loading: !fetcher.data,
        currentPostLimit,
        tiers,
        selectedPriceId,
        setSelectedPriceId,
        selected,
        teamId,
        volume,
      }}
    >
      {children}
    </BillingPlansContext.Provider>
  );
}

/** The tier picker (the primary column). */
export function BillingPlansTiers({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { loading, tiers, selectedPriceId, setSelectedPriceId, currentPostLimit } =
    useBillingPlans();

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {t("setup.billing.plans.empty")}
      </p>
    );
  }

  return (
    <Choicebox
      data-slot="billing-plans-tiers"
      value={selectedPriceId ? [selectedPriceId] : []}
      onValueChange={(value) => {
        const next = (value as string[])[0];
        if (next) setSelectedPriceId(next); // never allow an empty selection
      }}
      className={className}
    >
      {tiers.map((tier) => {
        const isCurrent =
          currentPostLimit != null && tier.postLimit === currentPostLimit;
        // At-or-below the current plan: shown for context, never selectable.
        const disabled =
          currentPostLimit != null && tier.postLimit <= currentPostLimit;
        return (
        <ChoiceboxItem
          key={tier.priceId}
          value={tier.priceId}
          disabled={disabled}
          className={cn(disabled && "pointer-events-none opacity-50")}
        >
          <ChoiceboxItemContent>
            <ChoiceboxItemTitle>
              {t("setup.billing.plans.postsOption", {
                posts: tier.postLimit,
              })}
            </ChoiceboxItemTitle>
            <ChoiceboxItemDescription>
              {isCurrent
                ? t("setup.billing.plans.currentPlan")
                : t("setup.billing.plans.pricePerMonth", {
                    amount: tier.price,
                    formatParams: { amount: priceParams(tier) },
                  })}
            </ChoiceboxItemDescription>
          </ChoiceboxItemContent>
          {disabled ? null : <ChoiceboxItemIndicator />}
        </ChoiceboxItem>
        );
      })}
    </Choicebox>
  );
}

/** The selected plan's price headline and value-props checklist. */
export function BillingPlansSummary({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const { loading, selected } = useBillingPlans();

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <Skeleton className="h-10 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const features = t("setup.billing.plans.features", {
    returnObjects: true,
  }) as unknown as string[];

  return (
    <div
      data-slot="billing-plans-summary"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-col gap-1">
        <p className="font-heading text-3xl font-bold text-foreground">
          {selected ? formatPrice(selected, i18n.language) : ""}
          <span className="text-lg font-medium text-muted-foreground">
            {t("setup.billing.plans.permo")}
          </span>
        </p>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("setup.billing.plans.subtitle")}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
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

    </div>
  );
}

/**
 * Continue → Stripe Checkout, where a first payment method is collected.
 *
 * Only used by `mode="checkout"`. An upgrade steps through the dialog's
 * carousel to a confirmation instead, and commits in-app — the customer already
 * has a card on file, so there is nothing for Checkout to collect.
 */
export function BillingPlansContinue({
  size = "lg",
}: {
  size?: React.ComponentProps<typeof BillingButton>["size"];
}) {
  const { t } = useTranslation();
  const { selectedPriceId, teamId, volume } = useBillingPlans();

  return (
    <BillingButton
      teamId={teamId}
      volume={volume}
      price={selectedPriceId}
      size={size}
    >
      {t("common.continue")}
    </BillingButton>
  );
}
