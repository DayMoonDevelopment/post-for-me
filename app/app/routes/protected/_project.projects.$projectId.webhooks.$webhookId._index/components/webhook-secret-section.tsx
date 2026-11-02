import { useTranslation } from "react-i18next";

import { Copyable } from "~/ui/copyable";
import { Field, FieldDescription, FieldLabel } from "~/ui/field";
import { InputSecret } from "~/ui/input-secret";

/**
 * The webhook's signing secret, masked by default with a bank-style reveal
 * toggle + a copy affordance. Unlike app credentials (PFM-684), this secret is
 * meant to be seen — it's the key the customer uses to verify delivery
 * signatures — so it's folded into the detail loader and shown here.
 */
export function WebhookSecretSection({ secretKey }: { secretKey: string }) {
  const { t } = useTranslation();
  return (
    <Field>
      <FieldLabel htmlFor="webhook-detail-secret">
        {t("webhooks.detail.secret")}
      </FieldLabel>
      <div className="flex items-center gap-2">
        <InputSecret
          id="webhook-detail-secret"
          name="webhook-detail-secret"
          readOnly
          value={secretKey}
          className="flex-1 font-mono"
          revealLabel={t("common.show")}
          hideLabel={t("common.hide")}
        />
        <Copyable
          value={secretKey}
          label={t("webhooks.form.copySecret")}
          copiedLabel={t("webhooks.form.copiedSecret")}
        />
      </div>
      <FieldDescription>{t("webhooks.detail.secretHint")}</FieldDescription>
    </Field>
  );
}
