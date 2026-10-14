import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useSearchParams } from "react-router";

import {
  Modal,
  ModalAside,
  ModalColumn,
  ModalColumns,
  ModalContent,
  ModalFooter,
  ModalTitle,
  ModalTrigger,
} from "~/components/modal";
import {
  ModalCarousel,
  ModalCarouselDots,
  ModalCarouselNav,
  ModalCarouselViewport,
  ModalSlide,
  useModalCarousel,
} from "~/components/modal";
import { Button } from "~/ui/button";

import {
  BILLING_PLANS_PARAM,
  BILLING_PLANS_VALUE,
} from "./billing-checkout-param";
import {
  BillingPlans,
  BillingPlansContinue,
  BillingPlansSummary,
  BillingPlansTiers,
  useBillingPlans,
} from "./billing-plans";
import { BillingUpgradeConfirm } from "./billing-upgrade-confirm";

/**
 * The new-customer entry point: a button that opens the plan picker in a wide,
 * framed {@link ~/components/modal Modal}. The tiers sit in the primary column,
 * the value-prop summary in the distinguished muted aside, and Continue is pinned
 * in the footer (the body scrolls between the pinned header and footer). Existing
 * customers go straight to the portal instead — see `BillingSetupButton`.
 */
/** The picker — the whole dialog for checkout, the first step for an upgrade. */
function PlansStep() {
  const { t } = useTranslation();
  return (
    <ModalColumns>
      {/* Title lives at the top of the leading column so the muted aside
          extends to the very top of the dialog. */}
      <ModalColumn className="flex flex-col gap-4">
        <ModalTitle>{t("setup.billing.plans.title")}</ModalTitle>
        <BillingPlansTiers />
      </ModalColumn>
      {/* `pt-14` drops the price down to align with the first tier (which the
          leading column's title offsets). */}
      <ModalAside className="flex flex-col pt-14">
        <BillingPlansSummary />
      </ModalAside>
    </ModalColumns>
  );
}

/**
 * The two-step upgrade: choose, then confirm what it costs.
 *
 * A CAROUSEL rather than a view stack — this is an ordered, button-driven
 * sequence, which is what `ModalCarousel` is for, and it brings the Back/Next/
 * Finish nav and the step dots with it. (`ModalViews` is for drilling into an
 * optional sub-view and back, which this isn't.)
 */
function UpgradeSteps({ onDone, teamId }: { onDone: () => void; teamId: string }) {
  const { t } = useTranslation();
  const { selectedPriceId } = useBillingPlans();
  const commit = useFetcher<{ ok?: boolean }>();
  const pending = commit.state !== "idle";

  // Close once the change has actually been applied; the page behind
  // revalidates onto the new plan on its own.
  React.useEffect(() => {
    if (commit.state === "idle" && commit.data?.ok) onDone();
  }, [commit.state, commit.data, onDone]);

  return (
    <ModalCarousel>
      {/* The framed modal pins its footer by bounding the body; the carousel
          has to pass that bound through or a tall step (eight tiers) grows the
          track and pushes the footer off-screen. HEIGHT only — the `[&>div]`
          hops reach Carousel's viewport and track, which take no props, and
          giving either `display:flex` would leave the track content-sized,
          collapsing each slide's `basis-full` so both render side by side.
          Scoped here rather than in `ModalCarouselViewport`: the onboarding and
          tour carousels have short slides and don't need it. */}
      <ModalCarouselViewport className="min-h-0 flex-1 overflow-hidden [&>div>div]:h-full [&>div]:h-full">
        <ModalSlide className="flex flex-col">
          <PlansStep />
        </ModalSlide>
        <ModalSlide className="overflow-y-auto">
          <ModalColumn className="flex flex-col gap-4">
            <ModalTitle>{t("billing.confirm.title")}</ModalTitle>
            <ConfirmStep teamId={teamId} priceId={selectedPriceId} />
          </ModalColumn>
        </ModalSlide>
      </ModalCarouselViewport>
      <ModalFooter className="sm:justify-between">
        <ModalCarouselDots />
        <ModalCarouselNav
          nextLabel={t("common.continue")}
          backLabel={t("common.back")}
          finishLabel={
            pending ? t("billing.confirm.pending") : t("billing.confirm.submit")
          }
          disabled={pending || !selectedPriceId}
          onFinish={() => {
            if (!selectedPriceId) return;
            commit.submit(
              { intent: "upgrade", price: selectedPriceId },
              { method: "post", action: `/teams/${teamId}/billing` },
            );
          }}
        />
      </ModalFooter>
    </ModalCarousel>
  );
}

/** Pricing only renders once its slide is the active one. */
function ConfirmStep({
  priceId,
  teamId,
}: {
  priceId: null | string;
  teamId: string;
}) {
  const { index } = useModalCarousel();
  return (
    <BillingUpgradeConfirm
      teamId={teamId}
      priceId={priceId}
      active={index === 1}
    />
  );
}

export function BillingPlansDialog({
  teamId,
  volume,
  label,
  currentPostLimit,
  mode = "checkout",
  size = "default",
  className,
}: {
  /** Applied to the trigger button — e.g. `w-full` for a pricing-card CTA. */
  className?: string;
  /** Current allowance — the matching tier is marked as the current plan and
   * anything at or below it is disabled. */
  currentPostLimit?: null | number;
  label?: React.ReactNode;
  /** `upgrade` switches the plan in place for a team that already pays; the
   * default `checkout` sends a first-time customer to Stripe. */
  mode?: "checkout" | "upgrade";
  size?: React.ComponentProps<typeof Button>["size"];
  teamId?: string | null;
  volume?: string | number | null;
}) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = React.useState(false);

  // URL-driven open: Stripe Checkout's "← back" returns to `?billing=plans`, so
  // the picker comes back up. Clear the flag on close so a refresh won't re-open.
  const urlOpen = searchParams.get(BILLING_PLANS_PARAM) === BILLING_PLANS_VALUE;
  React.useEffect(() => {
    if (urlOpen) setOpen(true);
  }, [urlOpen]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && urlOpen) {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.delete(BILLING_PLANS_PARAM);
          return params;
        },
        { replace: true },
      );
    }
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalTrigger render={<Button size={size} className={className} />}>
        {label ?? t("setup.billing.cta")}
      </ModalTrigger>
      {/* `sm:` prefix is required — DialogContent sets `sm:max-w-sm`, which an
          unprefixed `max-w-3xl` loses to at any width above `sm`, collapsing
          the columns below ModalColumns' `@2xl` split. */}
      <ModalContent layout="framed" className="sm:max-w-3xl">
        <BillingPlans
          teamId={teamId}
          volume={volume}
          currentPostLimit={currentPostLimit}
        >
          {/* An upgrade drills into a confirmation view before anything is
              charged; a first-time checkout has nothing to confirm here — the
              amount is collected by Stripe Checkout. */}
          {mode === "upgrade" && teamId ? (
            <UpgradeSteps teamId={teamId} onDone={() => handleOpenChange(false)} />
          ) : (
            <>
              <PlansStep />
              <ModalFooter>
                <BillingPlansContinue size="lg" />
              </ModalFooter>
            </>
          )}
        </BillingPlans>
      </ModalContent>
    </Modal>
  );
}
