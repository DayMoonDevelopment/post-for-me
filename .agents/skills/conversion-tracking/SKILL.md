---
name: conversion-tracking
description: >-
  Apply Post for Me's conversion-tracking conventions to any change that
  touches user/team lifecycle, billing, signup, the Stripe webhook,
  PostHog/Meta/Google integrations, or anything under `app/tracking/`. Use
  this skill whenever adding/modifying analytics events, working with PostHog
  identify/group calls, handling Stripe webhook events, building checkout or
  billing flows, wiring ad attribution, or adding any new user-lifecycle
  moment that might be worth tracking. Reach for it any time someone says
  "track this", "add a posthog event", "log this conversion", "do we capture
  X anywhere", or "should we be tracking…" — even if the word "conversion"
  isn't said. Default to firing when in doubt; under-tracking is the failure
  mode this skill exists to prevent.
---

# Conversion tracking

Post for Me sources every paid-lifecycle event from **Stripe webhooks** (not in-app actions) and ships them to PostHog, which forwards conversion events to **Meta Ads** and **Google Ads** via destinations. The whole funnel — discovery → signup → conversion → upgrades → cancellation — runs through this pipeline.

Tracking code is centralized in `app/tracking/` (browser) and `app/tracking/.server/` (server) in both `dashboard/` and `marketing/`. Route-specific firing happens in route files but always imports from the namespace. Each app's `tracking/README.md` is the tour map — read it before adding things.

## The attribution model — never violate this

- **PostHog person = the user.** `distinct_id` = Supabase auth user id.
  - Browser: `posthog.identify(user.id, …)`.
  - Server (webhook, cron): `distinctId = teams.created_by` (same user id).
- **PostHog group `team` = the billing entity**, keyed by `teams.id`.
  - Browser: `posthog.group("team", team.id, …)`.
  - Server: `setTeamGroupProperties(team.id, …)` *and* `teamId: team.id` on `captureServerEvent`.
- **All billing reporting is group-aggregated** (unique teams), not unique users. A user can be in many teams — group analytics handles it naturally.
- **PostHog has no person-less events.** You always pass a `distinctId`. For server-sourced billing events that's the team owner. The person is plumbing; the `team` group is the reporting unit.

## Hard rules for any new tracked event

1. **Paid-lifecycle events come from the Stripe webhook**, never from in-app button handlers. The webhook fires regardless of source — UI, API, automated flow, support agent in Stripe — and that's what makes the signal honest. The webhook lives at `dashboard/app/routes/api.stripe.webhook/`; analytics for subscription events lives in `.server/subscription-lifecycle-tracking.ts` adjacent to it.
2. **Dedupe deterministically.** Use `deterministicUuid("<event_name>:<stable_entity_id>")` as the `dedupeKey`. PostHog dedupes by `uuid`, so duplicate emission and replays are idempotent. Never use a random UUID.
3. **Stamp the source system's time.** Webhook events: `new Date(event.created * 1000)`. Real-time events (signup, cron decisions): default to now. Never let PostHog use ingestion time — retries and resends would land at the wrong moment.
4. **Attach the `team` group** when the event is about a team or its billing (`teamId: team.id` on `captureServerEvent`, `groups: { team: … }` if calling `posthog.capture` directly).
5. **Wrap analytics in try/catch at the call site.** `captureServerEvent` already swallows errors, but the helper that *prepares* the call (resolves team, reads metadata, computes properties) can still throw — keep it from taking down the surrounding webhook/cron handler.
6. **`system_triggered: true` marks automation; absence implies human-driven.** Only set the flag on events fired by the system (cron, scheduled tasks). Don't require it on every event — the failure mode would be silent mislabeling.
7. **No cross-sibling imports.** `dashboard/` and `trigger/` keep **vendored copies** of `tracking/.server/posthog.ts`. Keep them in sync by hand. Don't introduce a shared package or workspace alias.
8. **Pick the right property home — person / group / event:**
   - **Person properties**: identity / matching data (`email`, `first_name`, `last_name`, `gclid`, `fbclid`, `fbc`, `fbp`, `utm_*`). Set via `posthog.identify` browser-side. *Meta/Google destinations primarily read these.*
   - **Group properties**: current team state (`subscription_status`, `is_active`, `plan_post_limit`, `cancel_at_period_end`). Refresh on every relevant event so "is this team active?" is self-healing.
   - **Event properties**: the moment-of-event details (`from_post_limit` / `to_post_limit`, `price`, `currency`, `$current_url`, `$raw_user_agent`, `subscription_id`).

## Server-side event shape — copy this, don't reinvent

```ts
await captureServerEvent({
  distinctId: team.created_by,          // person = user (the team owner)
  event: "<event_name>",                 // snake_case, action-oriented
  teamId: team.id,                       // attaches the team group
  properties: {
    team_id: team.id,
    stripe_customer_id: customerId,
    subscription_id: subscription.id,
    plan_name: planInfo.planName,
    plan_post_limit: planInfo.postLimit,
    plan_price: planInfo.price,
    price: planInfo.price,               // alias for Meta destination's custom_data
    currency: (subscription.currency ?? "usd").toUpperCase(),
    // …event-specific props…
  },
  dedupeKey: deterministicUuid(`<event_name>:${subscription.id}`),
  timestamp: new Date(event.created * 1000),  // Stripe event time, not "now"
});
```

## Plans are ordered by post limit, not tier index

A higher `plan_post_limit` is a higher plan. When emitting upgrade/downgrade direction, compare `to_post_limit > from_post_limit`. Do **not** introduce tier indices or new ordinal columns — `plan_post_limit` is monotonic across `PRICING_TIERS` and is the natural ordering.

## Carrying browser context into server events

Server-side events fired from the Stripe webhook have **no browser context** — no `$current_url`, no `$raw_user_agent`, no `gclid` from the active URL. The dashboard captures these at **checkout-initiation** (in `_protected.$teamId.billing._index/route.loader.ts`) and stamps them into `subscription_data.metadata`. The webhook then reads `subscription.metadata` and stuffs them onto `customer_converted` / `subscription_reactivated`. **If you add a new conversion-style event that ad destinations should pick up, source the ad-attribution props the same way — from `subscription.metadata` via `adAttributionProps()` in `subscription-lifecycle-tracking.ts`.**

## Where pieces live

- `<app>/app/tracking/` — browser-safe namespace: `posthog-provider`, `posthog-identifier`, `pixels`, individual pixel components, `attribution` (browser cookie reader).
- `<app>/app/tracking/.server/` — server-only: `posthog.ts` (capture + group helpers), `attribution.ts` (request cookie reader).
- `<app>/app/tracking/README.md` — what's where, what calls it.
- Route-level emission stays in `routes/` but imports from `~/tracking/.server/...`:
  - Stripe webhook → `routes/api.stripe.webhook/.server/subscription-lifecycle-tracking.ts`
  - OTP verify → `routes/_auth.sign-in.otp.verify._index/route.action.ts`
  - Checkout metadata stamping → `routes/_protected.$teamId.billing._index/route.loader.ts`
  - PostHog identifier mount → `routes/_protected.$teamId/route.component.tsx`

If you're adding a new subscription-lifecycle event, the analytics belongs in `subscription-lifecycle-tracking.ts`. Don't sprinkle `captureServerEvent` calls in unrelated route handlers — the consolidation is intentional.

## Checklist for adding a new tracked event

- [ ] Event name is **snake_case, action-oriented** (`customer_converted`, not `userConvertedToCustomer`).
- [ ] `distinctId` resolves to a real `auth.users` id (browser: `user.id`; server: `teams.created_by`).
- [ ] `teamId` is passed when the event is team-scoped.
- [ ] `dedupeKey` is `deterministicUuid("<event_name>:<stable_entity_id>")`.
- [ ] `timestamp` reflects when the event *occurred*, not when it was ingested.
- [ ] Properties include `team_id`, `stripe_customer_id` (if billing), `subscription_id` (if subscription-related).
- [ ] If conversion-style, also include `price`, `currency`, and ad attribution via `adAttributionProps(subscription.metadata)`.
- [ ] Call site is `try {…} catch {…}` so analytics failures can't take down the handler.
- [ ] `system_triggered: true` is set **only** if the event was fired by automation (cron/scheduled task).
- [ ] `references/event-catalog.md` updated as part of the same PR.
- [ ] If the event should reach Meta/Google: confirm the destination's "Match events" filter includes it, and check `references/destination-mappings.md` for what properties each destination reads.

## Anti-patterns — refuse these

- Firing paid-lifecycle events from a browser button handler. (Misses support-driven changes, dunning cancellations, automated upgrades.)
- Setting `timestamp` to `new Date()` on a webhook handler. (A retried 5-minute-old Stripe event would land at the wrong time.)
- Reading person properties (`gclid`, `fbclid`) directly from PostHog inside a server handler — they're not in scope there. Source from `subscription.metadata` (set at checkout).
- Treating `trialing` as a paid conversion if/when trials are introduced. Current code does because we don't offer trials; add a separate `trial_started` event and redefine `customer_converted` as first *paid* subscription when that changes.
- Using a random `uuid` as the dedupe key. PostHog dedup requires determinism; randoms allow doubles.
- Cross-sibling imports — vendor the helper into each sibling instead.
- Adding new tier-ordinal columns or indices. Use `plan_post_limit` for ordering.

## When to escalate to the user

Ask before doing — these are not defaults:

- Adding a browser-side `fbq('track', …)` or `gtag('event', …)` for conversions. (We deliberately fire conversions only via PostHog → destinations, no browser dedup work.)
- Adding new PostHog destinations or modifying their event-name / property mappings. (Lives in PostHog UI, not the codebase, but affects what properties events must carry.)
- Adding `historical_migration: true` semantics or backdating to events older than ~1 year.
- Introducing a non-Stripe source for a paid-lifecycle signal.

## References

- `references/event-catalog.md` — canonical list of currently tracked events with the properties each carries. **Update with every PR that adds or modifies an event.**
- `references/destination-mappings.md` — what each PostHog destination reads (Meta CAPI, Google Ads). Useful when adding a new event that should reach an ad platform.
