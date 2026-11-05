# Stripe Webhook Processing

The dashboard `/api/stripe/webhook` endpoint verifies Stripe's signature and
awaits enqueueing `process-stripe-webhook`, not completion of its work. Failed
enqueues return 503 so Stripe can retry. Unsupported events return 200.

The task processes customer linking, subscription and invoice key reconciliation,
usage-limit increases, and paid-lifecycle analytics. Supported invoice events are
`invoice.created`, `invoice.paid`, and `invoice.payment_succeeded`.

Runs use the customer ID as their concurrency key with a per-key queue limit of
one. Stripe event IDs deduplicate enqueueing for seven days. Access is calculated
from current Stripe subscriptions, never from the historical event status, so a
late delinquency/cancellation event cannot revoke a recovered subscription's
access. Active or trialing subscriptions grant client-key access; system keys
also require an active new-pricing plan or legacy system-credentials add-on.

Key and project lists are paginated. Key writes settle in batches of ten, and
operational errors fail the task for retry. Analytics run best-effort after the
operational work, using the original event and timestamp for lifecycle history.
Billing helpers are vendored from dashboard equivalents; pricing env names and
analytics conventions must remain aligned across the independent siblings.

## Rollout

1. Configure the Trigger environment with the billing, Supabase, Unkey, pricing,
   and PostHog variables listed in `trigger/.env.example`.
2. Deploy Trigger first, then deploy the dashboard webhook change. The dashboard
   needs its existing Stripe webhook secret and Trigger enqueue credentials.
3. Monitor `process-stripe-webhook` failures in Trigger. Once Stripe receives
   200, worker retries are Trigger's responsibility, not Stripe's. If all five
   attempts fail, resolve the cause and replay the failed run in Trigger.

For a customer with stale disabled keys, replay a relevant Stripe event after
rollout (or replay its existing Trigger run). The worker reconciles their current
access regardless of the original event's subscription status. Within the
seven-day deduplication window, redelivering an already enqueued Stripe event
does not create a new run; replay that run in Trigger instead.
