import { useTranslation } from "react-i18next";

import type { BillingSummary } from "~/lib/.server/stripe/billing-summary";

import { DATE_FORMAT, LocaleDateTime } from "~/ui/date-time";
import {
  Receipt,
  ReceiptDivider,
  ReceiptFooter,
  ReceiptHeader,
  ReceiptItem,
  ReceiptItemAmount,
  ReceiptItemLabel,
  ReceiptItemNote,
  ReceiptItems,
  ReceiptTitle,
  ReceiptTotal,
  ReceiptTotalAmount,
  ReceiptTotalLabel,
} from "~/ui/receipt";

/** A bare amount (no surrounding sentence), so Intl is fine here — but it must
 * be bound to the ACTIVE language. `undefined` would use the operating system's
 * locale, which drifts from the rendered copy. See the `i18n` skill, Rule 1. */
function money(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
}

/**
 * The next charge, rendered as an actual receipt.
 *
 * An invoice preview IS a receipt — itemized lines running to a total — so it
 * uses the {@link ~/ui/receipt Receipt} primitive rather than a card
 * re-implementing the same layout. Only the padding and top radius are tuned to
 * sit in the page's card row — the muted paper, grain, and torn bottom edge are
 * the point, and are what set it apart from the cards beside it.
 *
 * Every line is Stripe's own `invoices.createPreview` output, so a metered
 * legacy plan shows its usage line and a tier shows its flat fee, with no
 * per-model branching here.
 */
export function UpcomingInvoiceCard({
  invoice,
  paymentMethod,
}: {
  invoice: NonNullable<BillingSummary["upcomingInvoice"]>;
  paymentMethod: BillingSummary["paymentMethod"];
}) {
  const { i18n, t } = useTranslation();

  return (
    <Receipt className="max-w-none rounded-t-xl px-6 pt-6 pb-8">
      <ReceiptHeader>
        <ReceiptTitle>{t("billing.invoice.title")}</ReceiptTitle>
      </ReceiptHeader>

      <ReceiptDivider />

      {/* Header facts as label→value rows, tighter than the line items below —
          they're context for the charge, not part of it. */}
      <ReceiptItems className="gap-1.5">
        {invoice.date ? (
          <ReceiptItem>
            <ReceiptItemLabel>{t("billing.invoice.date")}</ReceiptItemLabel>
            <ReceiptItemAmount>
              <LocaleDateTime value={invoice.date} pattern={DATE_FORMAT} />
            </ReceiptItemAmount>
          </ReceiptItem>
        ) : null}
        {paymentMethod ? (
          <ReceiptItem>
            <ReceiptItemLabel>{t("billing.invoice.card")}</ReceiptItemLabel>
            <ReceiptItemAmount>
              •••• {paymentMethod.last4}
            </ReceiptItemAmount>
          </ReceiptItem>
        ) : null}
      </ReceiptItems>

      <ReceiptDivider />

      <ReceiptItems>
        {invoice.lines.map((line, index) => (
          <ReceiptItem key={`${line.name}-${index}`}>
            <ReceiptItemLabel>{line.name}</ReceiptItemLabel>
            <ReceiptItemAmount>
              {money(line.amount, invoice.currency, i18n.language)}
            </ReceiptItemAmount>
            {/* What the line actually buys: a tier's allowance, or the number
                of posts a metered line is charging for. */}
            {line.postLimit != null ? (
              <ReceiptItemNote>
                {t("billing.invoice.upTo", {
                  limit: line.postLimit,
                })}
              </ReceiptItemNote>
            ) : line.quantity != null && line.quantity > 1 ? (
              <ReceiptItemNote>
                {t("billing.invoice.units", {
                  count: line.quantity,
                })}
              </ReceiptItemNote>
            ) : null}
          </ReceiptItem>
        ))}
      </ReceiptItems>

      <ReceiptDivider />

      <ReceiptTotal>
        <ReceiptTotalLabel>{t("billing.invoice.total")}</ReceiptTotalLabel>
        <ReceiptTotalAmount>
          {money(invoice.total, invoice.currency, i18n.language)}
        </ReceiptTotalAmount>
      </ReceiptTotal>

      <ReceiptFooter>{t("billing.invoice.footer")}</ReceiptFooter>
    </Receipt>
  );
}
