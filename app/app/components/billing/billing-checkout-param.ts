/**
 * The query flag that re-opens the plan-picker modal. Stripe Checkout's
 * `cancel_url` returns the user here (e.g. `/?billing=plans`) so clicking
 * "← back" in Checkout brings the payment modal back up instead of dropping them
 * on a bare page. {@link BillingPlansDialog} reads it to auto-open and clears it
 * on close. Plain strings (no React) so the server redirect action can build the
 * `cancel_url` from the same source of truth.
 */
export const BILLING_PLANS_PARAM = "billing";
export const BILLING_PLANS_VALUE = "plans";
