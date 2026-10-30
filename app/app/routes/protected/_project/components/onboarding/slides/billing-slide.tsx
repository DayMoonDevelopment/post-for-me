import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  BillingPlans,
  BillingPlansContinue,
  BillingPlansSummary,
  BillingPlansTiers,
} from "~/components/billing";

import {
  OnboardingSlideHeader,
  OnboardingSlideItem,
  OnboardingSlideScroll,
  useIsActiveStep,
  useOnboardingFlow,
} from "../onboarding";

/**
 * The terminal slide of the Getting Started modal: pick a plan. By the time the
 * user lands here the project is created and onboarding is recorded complete, so
 * the footer nav is hidden — the {@link BillingPlans} picker's own Continue
 * button takes them to Stripe Checkout for the chosen tier. The picker stacks
 * (container query) inside the narrow onboarding modal and scrolls here.
 */
export function BillingSlide() {
  const { t } = useTranslation();
  const { setFooterHidden, billingTeamId, volume } = useOnboardingFlow();
  const isActive = useIsActiveStep();

  // Hide the footer while this slide is on screen; restore on the way out.
  React.useEffect(() => {
    setFooterHidden(isActive);
    return () => setFooterHidden(false);
  }, [isActive, setFooterHidden]);

  return (
    <OnboardingSlideItem data-slot="onboarding-billing-slide" className="ps-0">
      <OnboardingSlideHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.billing.heading")}
        </h2>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("onboarding.billing.subheading")}
        </p>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll>
        {/* Stacked, footerless: the picker's own Continue takes over (the
            onboarding nav is hidden on this terminal slide). The two-column +
            footer arrangement is the standalone dialog's job. */}
        <BillingPlans teamId={billingTeamId} volume={volume}>
          <div className="flex flex-col gap-6">
            <BillingPlansTiers />
            <BillingPlansSummary />
            <BillingPlansContinue />
          </div>
        </BillingPlans>
      </OnboardingSlideScroll>
    </OnboardingSlideItem>
  );
}
