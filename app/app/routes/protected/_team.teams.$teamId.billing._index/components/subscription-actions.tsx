import { useTranslation } from "react-i18next";

import { BillingButton, BillingPlansDialog } from "~/components/billing";
import { ButtonGroup } from "~/ui/button-group";

/**
 * The subscription's actions, bare — no card around them. There's no content to
 * frame, and a border with a heading over two buttons would be a container that
 * hasn't earned one.
 *
 * A NON-connected group: nesting each button in its own `ButtonGroup` is how
 * this primitive separates them (the outer group's
 * `has-[>[data-slot=button-group]]:gap-2` adds the gap and each child keeps its
 * own radius). Connected segments would imply one control with modes; these are
 * two unrelated actions.
 *
 * Sits at the trailing edge, primary action last — the conventional reading
 * order for an action row.
 *
 * On a legacy plan `LegacyUpgradeCard` fills this slot instead, carrying the
 * same two actions beneath its pitch.
 */
export function SubscriptionActions({
  canUpgrade,
  postLimit,
  teamId,
}: {
  /** False on the top tier — there's nothing above it, and a picker that opens
   * empty is worse than no button. */
  canUpgrade: boolean;
  /** Current allowance, so the picker marks it and disables anything below. */
  postLimit: null | number;
  teamId: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end">
      <ButtonGroup>
        {canUpgrade ? (
          <ButtonGroup>
            <BillingPlansDialog
              teamId={teamId}
              mode="upgrade"
              currentPostLimit={postLimit}
              label={t("billing.actions.upgrade")}
            />
          </ButtonGroup>
        ) : null}
        <ButtonGroup>
          <BillingButton teamId={teamId} variant="secondary">
            {t("billing.manage")}
          </BillingButton>
        </ButtonGroup>
      </ButtonGroup>
    </div>
  );
}
