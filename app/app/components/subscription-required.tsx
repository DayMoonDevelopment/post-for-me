import { useTranslation } from "react-i18next";

import { BillingPlansDialog } from "~/components/billing";
import { WarningIcon } from "~/icons";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/ui/alert";

/**
 * The shared "this surface is API-backed and gated" state, used wherever a page
 * routes through the real API and the temp key couldn't be resolved.
 *
 * - `no_subscription` → an entity-relevant "an active plan is required" message
 *   plus a **Set up billing** CTA that opens the plan picker (all tiers) → Stripe
 *   checkout. This is the intended dead-end-free gate.
 * - `error` → a plain "temporarily unavailable" notice (transient / misconfig),
 *   no billing CTA.
 *
 * Copy is entity-relevant: `namespace` points at an i18n block that MUST provide
 * `subscription.{title,description}` and `error.{title,description}` (e.g.
 * `webhooks.unavailable`, `socialAccounts.unavailable`).
 */
/**
 * The feature namespaces that define an `unavailable.{subscription,error}` pair.
 *
 * A union rather than `string` so the keys this component builds
 * (`${namespace}.${scope}.title`) resolve to real bundle keys and stay checked —
 * a `string` here would silently opt every one of them out of type safety.
 */
export type SubscriptionGateNamespace =
  | "playground.unavailable"
  | "socialAccounts.unavailable"
  | "socialPostResults.unavailable"
  | "socialPosts.unavailable"
  | "webhooks.unavailable";

export function SubscriptionRequired({
  namespace,
  reason,
  teamId,
}: {
  namespace: SubscriptionGateNamespace;
  reason: "error" | "no_subscription";
  teamId: null | string;
}) {
  const { t } = useTranslation();
  const gated = reason === "no_subscription";
  const scope = gated ? "subscription" : "error";

  return (
    <Alert variant="warning">
      <WarningIcon />
      <AlertTitle>{t(`${namespace}.${scope}.title`)}</AlertTitle>
      <AlertDescription>{t(`${namespace}.${scope}.description`)}</AlertDescription>
      {gated ? (
        <AlertAction>
          <BillingPlansDialog
            teamId={teamId}
            size="sm"
            label={t("setup.billing.cta")}
          />
        </AlertAction>
      ) : null}
    </Alert>
  );
}
