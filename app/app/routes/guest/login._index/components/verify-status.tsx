import { useTranslation } from "react-i18next";

import { SuccessIcon } from "~/icons";
import { Spinner } from "~/ui/spinner";
import { Status, StatusPanel, type StatusState } from "~/ui/status";

/**
 * The OTP verification indicator: "Verifying…" (spinner) while busy, then
 * "Verified" (check) — zooming between states via Status. Idle shows nothing.
 *
 * Extracted so the verify step and the `/showcase/verify-status` demo render
 * the exact same component and can't drift.
 */
export function VerifyStatus({ status }: { status: StatusState }) {
  const { t } = useTranslation();
  return (
    <Status value={status}>
      <StatusPanel value="busy">
        <Spinner />
        <span className="text-sm text-muted-foreground">
          {t("login.verify.pending")}
        </span>
      </StatusPanel>
      <StatusPanel value="done">
        <SuccessIcon className="size-5 text-primary" />
        <span className="text-sm font-medium text-primary">
          {t("login.verify.verified")}
        </span>
      </StatusPanel>
    </Status>
  );
}
