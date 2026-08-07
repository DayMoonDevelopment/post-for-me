# Billing model

How the dashboard reads Stripe. The companion document, `BILLING-STATES.md`, is
about **states** — what each seeded scenario should render and how to verify it.
This one is about the **model**: what a product is, how a subscription is
classified, and where every number on the billing page comes from.

Everything here is read from Stripe at request time. Nothing about plans is
hardcoded — adding or repricing a tier is a Stripe edit, not a deploy.

---

## Two plan shapes

| | **Tier** (current) | **Legacy** (metered) |
| -- | -- | -- |
| Stripe price | `licensed`, recurring | `usage_type: "metered"` |
| Billing | prepaid, flat monthly | arrears, per post |
| Allowance | `metadata.social_post_limit` | none — uncapped |
| Product | 8 "Pro N" products | one, "Social Post API" |
| Page shows | usage bar against a cap | posts billed + the rate bands |

A legacy customer is not on a worse plan mechanically — they're on a *different
billing model*, and the whole reason the distinction exists in code is that a
progress bar against a cap is meaningless when there is no cap.

---

## The four metadata markers

Stripe metadata is the configuration surface. Three of these declare what a
product **is**; one carries what it **grants**.

| Key | Lives on | Value | Meaning |
| -- | -- | -- | -- |
| `social_post_limit` | product | `"1000"` | Monthly allowance, and by extension "this is a tier" |
| `allows_system_credentials_access` | **price** | `"true"` | Grants Quickstart (managed credentials) |
| `is_legacy` | product | `"true"` | Deprecated. **Absence means current** |
| `product_type` | product | `"social"` | Which product line |

Two of these are **cross-service contracts** — do not rename or remove them:

- `social_post_limit` is read straight off the Stripe product by the usage
  trigger jobs in the API repo (`trigger/increment-team-usage.ts`,
  `trigger/backfill-team-usage.ts`), which throw without it.
- `allows_system_credentials_access` is read from `price.metadata` by older
  dashboard code paths.

### Why these are separate axes

They were nearly collapsed into one field, and shouldn't be:

- **`is_legacy` is a lifecycle, not a kind.** It sits on the metered plan *and*
  on the credentials add-on, because both are things we'd like a customer to
  move off of. Making "legacy" a *kind* would mean an add-on can't also be
  deprecated.
- **`product_type` is a product line, not a role.** Encoding role into it
  (`social`, `social_legacy`, `social_addon`) multiplies values combinatorially
  as verticals are added. A future `messages` plan is one new `product_type`
  value; deprecating it reuses `is_legacy` unchanged.

### What is still inferred

**Add-on identity.** There's no `product_role` marker. An item is treated as an
add-on because it carries `allows_system_credentials_access` — which is correct
for every real product today, since managed credentials is our only add-on.

This is safe only because of an ordering guarantee and a precedence fallback,
both documented in `../subscription-access/product.ts`. Introduce a second add-on
and it will classify as `unknown`; that stays harmless while a real plan rides
the same subscription, and stops being harmless if an add-on can ever appear
alone. At that point, give add-ons their own marker.

---

## Classification

There are **two** classifiers, deliberately:

| | `subscription-access/product.ts` | `stripe/billing-summary.ts` |
| -- | -- | -- |
| Answers | "May this team call the API?" | "What do we show the human?" |
| Must stay liftable into the API | yes | no |
| Carries price / invoice detail | no | yes |

`stripe/subscription.ts` used to be a third, classifying on `items.data[0]`
blindly. It now delegates to `product.ts`.

### Precedence, not `items[0]`

Stripe does not order subscription line items meaningfully. A legacy
subscription can list its add-on first. So the item that **defines the plan** is
chosen by precedence (`tier` → `legacy` → `unknown`), never by index — otherwise
a legacy team's plan name reads "Managed Social App Credentials".

### Ordering inside `identifyProductType` is load-bearing

The credentials add-on carries **both** `allows_system_credentials_access` and
`is_legacy`. The add-on check must run **before** the legacy check, or the add-on
becomes plan-defining. Don't reorder those two lines.

A corollary for whoever edits Stripe: putting
`allows_system_credentials_access` on a *plan* product would reclassify it as an
add-on and leave the team looking planless. That flag belongs only on things
sold alongside a plan.

---

## `isLegacy` vs `hasTierData`

`BillingSummary.plan` exposes both, and they answer different questions:

- **`isLegacy`** — declared via `metadata.is_legacy`. Drives the **upgrade
  pitch** and the `LEGACY` badge.
- **`hasTierData`** — did the plan-defining product match a current tier, i.e.
  do we have an allowance, price and ladder position to render? Drives the
  **view shape**.

They coincide for every real plan. They diverge on a product we can't classify:
render the metered shape (it copes with a null limit) but don't tell someone
their plan is obsolete when we simply don't know. Before `is_legacy` existed,
one `!tier` inference did both jobs and an unrecognized product was told to
upgrade.

---

## Where the numbers come from

**Usage** — Stripe's **billing meter**, not Supabase. `readUsage` finds the
active meter matching `STRIPE_METER_EVENT` (default `post_successful`) and sums
`listEventSummaries` over the subscription's current period. This is the same
source for tiers and legacy; only the *presentation* differs.

> The Supabase tables `social_post_team_usage` and `team_social_post_meters`
> exist in `supabase.types.ts` but **no dashboard code reads them** — they're
> written and consumed on the API side. Earlier planning docs describe the
> dashboard reading two different usage sources by plan shape; it doesn't.

Meter summaries lag by up to a minute, so a freshly-seeded team can read `0`.

**Upcoming invoice** — Stripe's `invoices.createPreview` output, rendered line
for line. A metered plan shows its usage line, a tier its flat fee, with no
per-model branching in the UI.

**Pricing bands** — a tiered metered price carries its rates in `price.tiers`,
which is *not* returned by default and cannot be expanded from a subscription
list (`data.items.data.price.tiers` is five levels deep; Stripe caps expansion
at four). It needs its own `prices.retrieve`.

**Period boundaries** — read off the plan-defining item, not the subscription.

---

## What is manageable, and where

Plan changes are **in-app**, not in the Stripe customer portal. This was a
deliberate product decision, not drift — an earlier plan specced the portal for
plan switching, and the portal's role was deliberately narrowed:

| Action | Where |
| -- | -- |
| Choose a plan (first purchase) | Stripe **Checkout** |
| Change plan (upgrade) | **In-app** — `subscription-change.ts` |
| Payment method, invoices, cancel | Stripe **customer portal** |

The trade is explicit: we own the upgrade experience and therefore we own
proration correctness.

### Two upgrade models

Because the plans bill differently, `changeBehavior()` returns different Stripe
parameters per shape:

**Tier → tier** — prorate and keep the cycle.
```
proration_behavior: "always_invoice"   bill the difference now
(billing_cycle_anchor untouched)       renewal date does not move
```

**Legacy → tier** — settle arrears, prepay the new plan, restart the clock.
```
proration_behavior: "none"      no proration credits; nothing prepaid to credit
billing_cycle_anchor: "now"     closes the period and forces usage to invoice
```

**Both legacy settings are load-bearing.** `proration_behavior: "none"` without
the anchor reset silently *drops accrued usage* — measured, not assumed. The
anchor reset is what closes the period and forces the metered usage to invoice.
Don't remove one without the other. Seeded state 28 (`odd-volume`) exists as the
regression test for this.

Item handling differs too: a tier→tier move **replaces the price on the existing
item** so Stripe can credit unused time. Deleting and re-adding would look like a
cancel plus a new subscription and lose the proration. Anything else — legacy,
add-ons — is cleared and replaced.

The preview and the commit share `switchToTierItems()` and `changeBehavior()`, so
the quote on the confirmation screen is produced by the same parameters that
produce the invoice.

---

## The API-key contract

The dashboard stamps advisory plan metadata onto API keys:
`plan_type`, `plan_name`, `plan_post_limit`, `plan_product_id`.

`plan_type` is a **cross-service contract**: the API gates
`/social-account-feeds` (and the post analytics served through it) on
`plan_type === "new_pricing"`. Values are `new_pricing` | `legacy` | `unknown`.

**Do not confuse it with `is_legacy`.** They point opposite directions:

| | `is_legacy` | `plan_type` |
| -- | -- | -- |
| Lives on | Stripe product | API key metadata |
| Direction | input (we read it) | output (we write it) |
| Audience | this repo only | the API |

The metadata is advisory and best-effort — a catalog read failure yields empty
plan metadata rather than blocking a key from being minted. The `active` flag is
what actually gates minting.

---

## Adding a product vertical

The scheme is built to absorb one:

1. Give the new product line `product_type = "<vertical>"` and its own limit key
   (`message_limit`, on the same naming shape as `social_post_limit`).
2. `listPricingTiers()` already excludes products declaring a different
   `product_type` — matching is negative, so *absence* reads as social. Tighten
   it to a positive match once every live product carries the marker.
3. `is_legacy` and `allows_system_credentials_access` need no change; both are
   vertical-agnostic by construction.

---

## Verifying

`bun run verify:billing` asserts view, subscription status, and key state across
the seeded matrix. See `BILLING-STATES.md` for what each state means and how to
restore one.

It asserts the **view**, which is driven by `hasTierData`. It does **not** cover
the declared `isLegacy` — the upgrade pitch and the `LEGACY` badge still need an
eye on the page.
