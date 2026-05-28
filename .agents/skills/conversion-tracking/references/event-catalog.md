# Event catalog

Authoritative list of currently tracked PostHog events. **Update this file in the same PR whenever you add, remove, or rename an event** — the SKILL.md checklist points here.

## Browser identity (not events, but identity wiring)

| Call | Where | Properties |
|---|---|---|
| `posthog.identify(user.id, …)` | `dashboard/app/tracking/posthog-identifier.tsx` | `email`, `created_at`, `first_name`, `last_name`, `gclid`, `fbclid`, `fbc`, `fbp`, `utm_*` |
| `posthog.group("team", team.id, …)` | same | `name`, `stripe_customer_id`, `billing_email` |

PostHog SDK also auto-captures `$initial_referrer`, `$initial_utm_*`, `$initial_gclid`, `$initial_fbclid` as person properties on the first identified pageview.

## Lifecycle events

### `user_signed_up`

| | |
|---|---|
| Fires | First-time signup (account `created_at` < 60s ago) |
| Source | `dashboard/app/routes/_auth.sign-in.otp.verify._index/route.action.ts` |
| distinct_id | `user.id` |
| team group | The auto-created team where `teams.created_by = user.id` |
| properties | `email` |
| timestamp | now |
| dedupe | `user_signed_up:<user.id>` |

### `customer_converted`

| | |
|---|---|
| Fires | Customer reaches `active`/`trialing` AND has no prior real subscription |
| Source | `dashboard/.../subscription-lifecycle-tracking.ts` → `maybeTrackConversionOrReactivation` |
| distinct_id | `teams.created_by` |
| team group | `team.id` (resolved via `subscription.metadata.team_id`, fallback to `stripe_customer_id` lookup) |
| properties | `baseProps` + `adAttributionProps(subscription.metadata)` |
| timestamp | `new Date(event.created * 1000)` |
| dedupe | `customer_converted:<subscription.id>` |

### `subscription_reactivated`

| | |
|---|---|
| Fires | Customer reaches `active`/`trialing` AND has a prior real subscription (churn → return) |
| Notes | Same shape as `customer_converted`. Abandoned `incomplete*` subs don't count as "prior". |
| dedupe | `subscription_reactivated:<subscription.id>` |

### `subscription_upgraded` / `subscription_downgraded`

| | |
|---|---|
| Fires | `customer.subscription.updated` with a change in `plan_post_limit` |
| Direction | `to_post_limit > from_post_limit` → upgraded; `<` → downgraded |
| Prior tier | From `event.data.previous_attributes.items[].price.product` |
| properties | `baseProps` + `from_post_limit`, `to_post_limit` |
| dedupe | `<eventName>:<subscription.id>:<from>:<to>` |

### `subscription_cancel_scheduled`

| | |
|---|---|
| Fires | `customer.subscription.updated` where `cancel_at_period_end` flips `false → true` |
| properties | `baseProps` + `cancel_at` |
| dedupe | `subscription_cancel_scheduled:<subscription.id>:<cancel_at>` |

### `subscription_canceled`

| | |
|---|---|
| Fires | `customer.subscription.deleted` |
| properties | `baseProps` |
| dedupe | `subscription_canceled:<subscription.id>` |

### `subscription_upgrade_scheduled`

| | |
|---|---|
| Fires | `trigger/process-usage-limits.ts` cron schedules an automated upgrade (first schedule + escalation) |
| Flag | `system_triggered: true` |
| properties | `from_post_limit`, `to_post_limit`, `previous_scheduled_post_limit`, `usage_count`, `current_limit`, `is_escalation` |
| dedupe | `subscription_upgrade_scheduled:<subscription.id>:<toTier.productId>` |

## `baseProps` shape (every subscription event)

```ts
{
  team_id,
  stripe_customer_id,
  subscription_id,
  plan_name,
  plan_post_limit,
  plan_price,
  price,        // alias for Meta destination's custom_data
  currency,     // upper-cased
  is_legacy,
}
```

## Team group properties (current state, refreshed on every subscription event)

| Property | Meaning |
|---|---|
| `name` | Team display name |
| `subscription_status` | Stripe subscription status (`active`, `trialing`, `past_due`, `canceled`, …) |
| `plan_name` | "Pro" for new-pricing tiers, "Legacy Plan" for the old product |
| `plan_post_limit` | The post limit of the current plan (null for legacy/unknown) |
| `plan_price` | Dollar amount of the current plan |
| `is_active` | `subscription_status` is `active` or `trialing` |
| `cancel_at_period_end` | Whether the sub is set to cancel at period end |

## Person properties (set via identify, primarily for ad destinations)

| Property | Source |
|---|---|
| `email`, `created_at`, `first_name`, `last_name` | `auth.users` + `user.user_metadata` |
| `gclid`, `fbclid` | `pfm_attribution` cookie (written by marketing on first-touch landing) |
| `fbc`, `fbp` | Meta Pixel's `_fbc` / `_fbp` cookies |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | `pfm_attribution` cookie |
| `$initial_*` | Auto-captured by PostHog SDK on first pageview |

## Events deliberately **not** tracked

- Browser-side `Subscribe` / `Purchase` / `CompleteRegistration`. Conversions are sourced server-side via PostHog → Meta/Google destinations, so no browser dedup work and no risk of double-counting.
- `subscription_cancel_scheduled` as a historical backfill — only current `cancel_at_period_end` state exists, can't reconstruct when the flag was originally flipped.
- Refund events — needs the API's `stripe.*` mirror (charge events) and is deferred. Open if/when it matters.
