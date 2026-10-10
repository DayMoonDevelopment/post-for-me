import { useTranslation } from "react-i18next";

import {
  SetupScreen,
  SetupScreenBody,
  SetupScreenHeader,
} from "~/components/setup-screen";
import { BillingIcon } from "~/icons";

import { BillingSetupButton } from "./billing-setup-button";

/**
 * Display-neutral content of the "set up billing" step (the guided-tour slide).
 * Its primary action is the state-aware {@link BillingSetupButton}: existing
 * customer → Manage (portal); new customer → opens the plan picker. `teamId`
 * comes from the launchpad `SetupContext`.
 */
export function BillingContent() {
  const { t } = useTranslation();
  return (
    <SetupScreen data-slot="billing-content">
      <SetupScreenHeader
        icon={<BillingIcon />}
        title={t("setup.billing.title")}
        description={t("setup.billing.description")}
      />
      <SetupScreenBody className="items-start gap-4">
        <p className="text-sm/relaxed text-muted-foreground">
          {t("setup.billing.body")}
        </p>
        <BillingSetupButton size="lg" />
      </SetupScreenBody>
    </SetupScreen>
  );
}
