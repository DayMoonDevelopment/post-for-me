# subscription-access — churn protection (INTERIM)

Revokes API access when a team stops paying, and restores it when it resumes.
Keys live in Unkey; a disabled key fails `verifyKey`, so the API 401s without
knowing anything about billing.

- `catalog.ts` — the Stripe products/tiers needed to classify line items.
- `product.ts` — pure classification: `identifyProductType` + one
  `handle<Kind>Product` per kind. No I/O, no branching inside a handler.
- `entitlement.ts` — live Stripe state → `{ active, systemCredentials, planMeta }`.
- `sync-api-key-access.ts` — Stripe customer → team → projects → toggle keys.
- Trigger: `POST /webhook/stripe/subscription-access`.

## Why it lives here

The dashboard otherwise doesn't receive Stripe webhooks — the API owns them and
is the intended source of paid-lifecycle/conversion events. This is a deliberate
exception, re-introducing the v1 `updateAPIKeyAccess` behavior to close an
active revenue leak (PFM-936): nothing else revoked keys on churn.

**It is meant to be lifted into the API.** Keep it that way:

- Everything is in this folder plus the one route; nothing else imports it.
- Its only inbound edges are the Stripe client, the pricing read, the Unkey
  helpers, and the service-role Supabase client — all replaceable at the API.
- No PostHog, no session, no team/project services — the API owns those events
  and reads its own data.

## Behavior

Access and plan are two independent questions:

- **Access follows subscription STATUS**, and status only. Entitling: `active`,
  `trialing`. `past_due` (failed payment), `canceled`, `paused` revoke —
  matching v1. An unclassifiable product never costs a paying team its access.
- **Plan follows line ITEMS.** Every item of every entitling subscription is
  classified; the `plan_*` meta comes from the highest-precedence item
  (`tier` > `legacy` > `unknown`), never from `items.data[0]` — Stripe does not
  order line items, and the managed-credentials add-on is its own item.
- Managed-credential ("system") projects only re-enable when some item grants
  the add-on: current tiers include it; legacy plans need
  `allows_system_credentials_access = "true"` on the price or product.
- Access is re-read from **live Stripe state**, not the event payload, so
  replays and out-of-order deliveries converge.
- Already-correct keys are skipped, so a renewal doesn't rewrite every key.
- Partial failure → the route 500s and Stripe retries; the sync is idempotent.

## Product markers (Stripe config, not code)

`product.ts` classifies from metadata, so the taxonomy is edited in Stripe.
Marker names are un-prefixed and stay that way — `social_post_limit` is the
established key and the naming shape for per-vertical limits to come
(`message_limit`, …), one key per vertical:

| kind | marker | today |
| --- | --- | --- |
| `tier` | product `metadata.social_post_limit` | ✅ all 8 Pro tiers |
| `legacy` | `metadata.plan_type = "legacy"` | ❌ not set on any product |
| `addon` | `metadata.addon = "true"` | ❌ not set (the creds add-on carries only its own flag) |
| — | `metadata.allows_system_credentials_access = "true"` | ✅ "Managed System Credentials" |

Stripe Features/Entitlements are the intended long-term access layer. They
grant boolean access only (no numeric field on an active entitlement), so they
would sit BESIDE these limit keys, not replace them.

Until the missing markers exist, non-tier items classify as `unknown` and stamp
`plan_type = "unknown"` (v1 said `"legacy"` for one specific product id read
from an env var). Nothing branches on that value today — the API's only plan
gate is `plan_type === "new_pricing"` — so this is cosmetic until the Stripe
pass sets the markers, at which point the handlers already do the right thing.

## Config

`STRIPE_WEBHOOK_SECRET_SUBSCRIPTION_ACCESS` and `SUPABASE_SERVICE_ROLE_KEY`.
Without either, the route 500s — Stripe retries and the failures show up in the
logs, rather than quietly leaving access on.

Stripe events for this endpoint (and no others):
`customer.subscription.created|updated|deleted|paused|resumed`,
`invoice.paid`, `invoice.payment_failed`.
