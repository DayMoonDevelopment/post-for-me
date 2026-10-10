/**
 * Sets the Stripe billing-portal configuration to the division we've settled on:
 * **the portal manages the payment relationship; the app manages the plan.**
 *
 *   bun run stripe:portal          show the current configuration
 *   bun run stripe:portal:apply    write the intended one
 *
 * | feature | state | why |
 * | --- | --- | --- |
 * | `subscription_update` | **off** | plan changes happen in-app, where we can show a real preview, apply our own proration rules, and keep legacy customers off a picker that doesn't understand metered billing |
 * | `subscription_cancel` | on, `at_period_end` | cancelling IS managing the payment relationship, so it belongs here — and a prepaid month should be honoured rather than cut short |
 * | `payment_method_update` | on | the whole reason to send anyone to Stripe |
 * | `customer_update` | on (email, address, name, phone) | billing identity |
 * | `invoice_history` | on | receipts |
 *
 * Run against test and live separately — configurations don't cross modes.
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
const apply = process.argv.includes("--apply");

const INTENDED: Stripe.BillingPortal.ConfigurationUpdateParams.Features = {
  // The app owns plan changes. Leaving this on would let a customer switch
  // plans without the confirmation screen, bypassing our proration rules —
  // and would offer a legacy customer tier options that don't fit how they bill.
  subscription_update: { enabled: false },
  subscription_cancel: {
    enabled: true,
    // They paid through the end of the period; ending access early would be
    // taking that back. Our churn sweep keeps their keys live until it lapses,
    // and the billing page shows "Cancels on <date>" in the meantime.
    mode: "at_period_end",
    proration_behavior: "none",
    cancellation_reason: {
      enabled: true,
      options: [
        "too_expensive",
        "missing_features",
        "switched_service",
        "unused",
        "customer_service",
        "too_complex",
        "low_quality",
        "other",
      ],
    },
  },
  payment_method_update: { enabled: true },
  customer_update: {
    enabled: true,
    allowed_updates: ["email", "address", "name", "phone"],
  },
  invoice_history: { enabled: true },
};

function describe(configuration: Stripe.BillingPortal.Configuration) {
  const f = configuration.features;
  console.log(`${configuration.id}  default=${configuration.is_default}`);
  console.log(`  subscription_update   ${f.subscription_update?.enabled}`);
  console.log(
    `  subscription_cancel   ${f.subscription_cancel?.enabled} (${f.subscription_cancel?.mode})`,
  );
  console.log(`  payment_method_update ${f.payment_method_update?.enabled}`);
  console.log(`  customer_update       ${f.customer_update?.enabled}`);
  console.log(`  invoice_history       ${f.invoice_history?.enabled}`);
}

const configurations = await stripe.billingPortal.configurations.list({ limit: 10 });
const target =
  configurations.data.find((configuration) => configuration.is_default) ??
  configurations.data[0];

if (!target) {
  throw new Error("no billing portal configuration exists for this account");
}

console.log("BEFORE");
describe(target);

if (!apply) {
  const drifted =
    target.features.subscription_update?.enabled !== false ||
    target.features.subscription_cancel?.mode !== "at_period_end";
  console.log(
    drifted
      ? "\n⚠️  differs from intent — run `bun run stripe:portal:apply`"
      : "\n✅ matches intent",
  );
} else {
  const updated = await stripe.billingPortal.configurations.update(target.id, {
    features: INTENDED,
  });
  console.log("\nAFTER");
  describe(updated);
}
