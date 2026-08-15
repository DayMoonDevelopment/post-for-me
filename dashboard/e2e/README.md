# Dashboard e2e — subscription access enforcement

Covers PFM-936: a team that stops paying must lose API access, and a team that
resumes paying must get it back.

**Local only.** This suite is not wired into CI and shouldn't be. It drives a
real Stripe test-mode account, a real Unkey API, and a local Supabase — because
that interaction *is* the behavior under test. The webhook deliberately ignores
the status carried on the event and re-reads live Stripe state, so a suite built
on fabricated Stripe state would assert nothing.

## What is and isn't real

| Piece | Real? |
| --- | --- |
| Supabase (local) | yes |
| Stripe customers, subscriptions, statuses | yes — test mode |
| Unkey keys and their `enabled` state | yes |
| Stripe's *delivery* of the webhook | no — signed and POSTed locally |

Only delivery is simulated. `stripe listen` is avoided on purpose: it
authenticates separately from `STRIPE_SECRET_KEY`, so it can forward events from
a different account than the app reads. That misalignment is what stalled the
first attempt at verifying this issue. Signing locally makes it structurally
impossible.

## Prerequisites

1. Local Supabase running (from `api/`): `cd api && bun run supabase:start`
2. A populated `dashboard/.env`. **A normal dashboard `.env` is enough** — the
   suite reads it through Vite's own `loadEnv` (see `fixtures/load-env.ts`),
   because Playwright runs under Node and doesn't read `.env` by itself.

It uses these vars, all of which a working dashboard already has:

```bash
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY          # must be a TEST-mode key
STRIPE_WEBHOOK_SECRET      # any value — only used to sign locally
STRIPE_PRICING_TIER_*_PRODUCT_ID
UNKEY_API_ID, UNKEY_ROOT_KEY
```

Optional overrides:

```bash
E2E_BASE_URL=http://localhost:5173
E2E_USER_EMAIL=e2e-churn@example.com
E2E_USER_PASSWORD=password
E2E_STRIPE_PRICE_ID=price_...   # see below
```

Subscriptions are created against a recurring price on one of the configured
`STRIPE_PRICING_TIER_*_PRODUCT_ID` products, discovered automatically. That
matters: on any other product the entitlement resolver classifies the plan as
`unknown` and the system-credential assertions stop meaning anything. Set
`E2E_STRIPE_PRICE_ID` only to pin a specific one.

Anything exported in your shell takes precedence over `.env`, so a one-off
override still works: `E2E_BASE_URL=... bun run test:e2e`.

## Running

```bash
cd dashboard
bun run test:e2e          # headless
bun run test:e2e:ui       # Playwright UI mode
bun run test:e2e:headed   # watch it drive a real browser
```

## Cleanup

Each spec provisions its own team, Stripe customer, subscription and Unkey key,
and tears them down in `afterEach`. If a run is killed mid-spec, leftovers are
identifiable by the `e2e: "true"` metadata on the Stripe customer and the
`E2E Churn Team` name prefix on the team.

## Known gap

The grace-period spec skips unless Stripe actually moves the subscription to
`past_due`, which needs a default payment method configured to fail on the test
customer. Set one up in the test account to exercise it; otherwise that path is
covered only by the resolver unit tests
(`app/lib/.server/resolve-subscription-entitlement.test.ts`).
