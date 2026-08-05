import type * as React from "react";

import { useTranslation } from "react-i18next";

import { useOptionalSetupContext } from "~/components/setup-context";
import { Button } from "~/ui/button";

import { BillingButton } from "./billing-button";
import { BillingPlansDialog } from "./billing-plans-dialog";

/**
 * The state-aware billing entry — the launchpad's billing step `Action` and the
 * tour slide CTA. Reads `SetupContext`:
 *   - active subscription  → "Manage billing", straight to the Stripe portal.
 *   - none                 → "Set up billing", opens the plan picker.
 */
export function BillingSetupButton({
  size = "sm",
}: {
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const { t } = useTranslation();
  const ctx = useOptionalSetupContext();
  const teamId = ctx?.teamId ?? null;

  if (ctx?.billingComplete) {
    // Billing's already set up — "Manage" is a quieter, secondary action.
    return (
      <BillingButton teamId={teamId} size={size} variant="secondary">
        {t("setup.billing.manage")}
      </BillingButton>
    );
  }

  return (
    <BillingPlansDialog
      teamId={teamId}
      size={size}
      label={t("setup.billing.cta")}
    />
  );
}
