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

There are **two classes of tracked events**, and the distinction governs where they fire:

- **Paid-lifecycle events** (`customer_converted`, `subscription_*`) — sourced from the **Stripe webhook**, never from in-app handlers. The webhook is the honest signal (it fires regardless of source: UI, API, support agent, dunning). Live in `subscription-lifecycle-tracking.ts`.
- **User-lifecycle events** (`user_signed_up`, `team_created`, `project_created`/`_deleted`, `team_member_invited`/`_joined`/`_removed`) — sourced from **in-app route actions**, because that's where the user intent actually happens (there's no webhook for "user created a project"). Consolidated in `tracking/.server/lifecycle-tracking.ts`.

Tracking code is centralized in `app/tracking/` (browser) and `app/tracking/.server/` (server) in both `dashboard/` and `marketing/`. Route-specific firing happens in route files but always imports from the namespace. Each app's `tracking/README.md` is the tour map — read it before adding things.

## The attribution model — never violate this

- **PostHog person = the user.** `distinct_id` = Supabase auth user id.
  - Browser: `posthog.identify(user.id, …)`.
  - Server (webhook, cron): `distinctId = teams.created_by` (same user id).
- **PostHog group `team` = the billing entity**, keyed by `teams.id`.
  - Browser: `posthog.group("team", team.id, …)`.
  - Server: `setTeamGroupProperties(team.id, …)` *and* `teamId: team.id` on `captureServerEvent`.
- **PostHog group `project` = a project**, keyed by `projects.id`. A user acts on behalf of one project at a time.
  - Browser: `posthog.group("project", project.id, …)` (fires only on project-scoped routes).
  - Server: `setProjectGroupProperties(project.id, …)` *and* `projectId: project.id` on `captureServerEvent`. Project-scoped events attach **both** the `team` and `project` groups.
  - Two group types are defined (`team`, `project`); PostHog allows up to 5. Don't add a third without a reason.
- **All billing reporting is group-aggregated** (unique teams), not unique users. A user can be in many teams — group analytics handles it naturally.
- **PostHog has no person-less events.** You always pass a `distinctId`. For server-sourced billing events that's the team owner. The person is plumbing; the `team` group is the reporting unit.

## Hard rules for any new tracked event

1. **Paid-lifecycle events come from the Stripe webhook**, never from in-app button handlers. The webhook fires regardless of source — UI, API, automated flow, support agent in Stripe — and that's what makes the signal honest. The webhook lives at `dashboard/app/routes/api.stripe.webhook/`; analytics for subscription events lives in `.server/subscription-lifecycle-tracking.ts` adjacent to it. **User-lifecycle events** (signup, team/project/membership) are the exception: they fire from the in-app route action that performs the mutation, via `tracking/.server/lifecycle-tracking.ts` (fire-and-forget). There's no webhook for them, and the in-app action *is* the honest source.
2. **Dedupe deterministically.** Use `deterministicUuid("<event_name>:<stable_entity_id>")` as the event's `uuid` — derived from IDs we own (`user.id`, `subscription.id`, `team.id`, …), never a random UUID. **Caveat (verified against the project):** PostHog does **not** drop duplicate-`uuid` rows at ingestion or query time — its uuid dedup is an eventual ClickHouse merge, not an upsert. So re-emitting an event **adds a duplicate row** that `count()` sees; a re-run is *not* silently idempotent. The deterministic uuid's real payoff is that duplicates are **collapsible after the fact**: `count(DISTINCT uuid)` (or `DISTINCT <entity_id>`) always yields the true count. Practical rule: the live webhook fires once per event so this rarely bites; for the backfill, prefer not to re-emit (run once / resume after a crash) and **always analyze on `DISTINCT uuid`**.
3. **Stamp the source system's time.** Webhook events: `new Date(event.created * 1000)`. Real-time events (signup, cron decisions): default to now. Never let PostHog use ingestion time — retries and resends would land at the wrong moment.
4. **Attach the `team` group** when the event is about a team or its billing (`teamId: team.id` on `captureServerEvent`). **Also attach the `project` group** (`projectId: project.id`) when the event is about a specific project. Project-scoped events carry both.
5. **Wrap analytics in try/catch at the call site.** `captureServerEvent` already swallows errors, but the helper that *prepares* the call (resolves team, reads metadata, computes properties) can still throw — keep it from taking down the surrounding webhook/cron handler.
6. **`system_triggered: true` marks automation; absence implies human-driven.** Only set the flag on events fired by the system (cron, scheduled tasks). Don't require it on every event — the failure mode would be silent mislabeling.
7. **No cross-sibling imports.** `dashboard/` and `trigger/` keep **vendored copies** of `tracking/.server/posthog.ts`. Keep them in sync by hand. Don't introduce a shared package or workspace alias.
8. **Pick the right property home — person / group / event:**
   - **Person properties**: identity / matching data (`email`, `first_name`, `last_name`, `gclid`, `fbclid`, `fbc`, `fbp`, `utm_*`). Set via `posthog.identify` browser-side. *Meta/Google destinations primarily read these.*
   - **Group properties**: current team state (`subscription_status`, `is_active`, `plan_post_limit`, `cancel_at_period_end`, `member_count`, `project_count`). Refresh on every relevant event so "is this team active?" / "how big is it?" is self-healing. `groupIdentify` **merges**, so `refreshTeamShape()` (counts) and the subscription tracker (billing state) update disjoint keys without clobbering each other.
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

## User-lifecycle events (team / project / membership)

These fire from in-app route actions via `tracking/.server/lifecycle-tracking.ts`. Use its helpers (`trackTeamCreated`, `trackProjectCreated`, `trackProjectDeleted`, `trackTeamMemberInvited`, `trackTeamMemberJoined`, `trackTeamMemberRemoved`, `refreshTeamShape`) rather than calling `captureServerEvent` from the route directly — that's the user-lifecycle analog of `subscription-lifecycle-tracking.ts`. Each helper is best-effort and is invoked fire-and-forget (`void helper(...).catch(...)`) so analytics can't slow or break the action.

- **`role` is derived, never stored.** There's no `role` column on `team_users`. The team's `created_by` is the `owner`; everyone else is a `member` — `roleForTeam(team.created_by, userId)`. If a real roles system lands later, replace the derivation everywhere, don't add ad-hoc role columns.
- **Signup splits invited vs organic.** Every new user gets a personal auto-team + default project from DB triggers. An **invited** user (`user_metadata.source.type === "invite"`) is attributed to the team they joined (`role: member`); an **organic** user to their personal team (`role: owner`). The live path skips invited users' throwaway personal teams for `team_created`/`project_created`; the backfill replays the whole table (dedupe keeps it idempotent).
- **Joined = seat activation.** `team_member_joined` fires when an existing user is added (immediate) or an invited new user first authenticates — not at invite time. The team creator's own seat is covered by `team_created`, not a join event.
- **Counts are self-healing.** `refreshTeamShape()` recomputes `member_count`/`project_count` after every membership/project change.
- **Auto-created default projects count as user-driven.** We're moving away from auto-creating projects; until then, treat the trigger-created default project as if the user made it (fire `project_created` for it) so the activation signal stays continuous.

## Plans are ordered by post limit, not tier index

A higher `plan_post_limit` is a higher plan. When emitting upgrade/downgrade direction, compare `to_post_limit > from_post_limit`. Do **not** introduce tier indices or new ordinal columns — `plan_post_limit` is monotonic across `PRICING_TIERS` and is the natural ordering.

## Carrying browser context into server events

Server-side events fired from the Stripe webhook have **no browser context** — no `$current_url`, no `$raw_user_agent`, no `gclid` from the active URL. The dashboard captures these at **checkout-initiation** (in `_protected.$teamId.billing._index/route.loader.ts`) and stamps them into `subscription_data.metadata`. The webhook then reads `subscription.metadata` and stuffs them onto `customer_converted` / `subscription_reactivated`. **If you add a new conversion-style event that ad destinations should pick up, source the ad-attribution props the same way — from `subscription.metadata` via `adAttributionProps()` in `subscription-lifecycle-tracking.ts`.**

## Where pieces live

- `<app>/app/tracking/` — browser-safe namespace: `posthog-provider`, `posthog-identifier`, `pixels`, individual pixel components, `attribution` (browser cookie reader).
- `<app>/app/tracking/.server/` — server-only: `posthog.ts` (capture + team/project group helpers), `lifecycle-tracking.ts` (team/project/membership event helpers + `refreshTeamShape` + `roleForTeam`), `attribution.ts` (request cookie reader).
- `<app>/app/tracking/README.md` — what's where, what calls it.
- Route-level emission stays in `routes/` but imports from `~/tracking/.server/...`:
  - Stripe webhook → `routes/api.stripe.webhook/.server/subscription-lifecycle-tracking.ts`
  - OTP verify (signup + invited-user join) → `routes/_auth.sign-in.otp.verify._index/route.action.ts`
  - Team create → `routes/api.teams.new/route.action.ts`
  - Project create / delete → `routes/_protected.$teamId.new._index/route.action.ts`, `routes/_protected.$teamId.$projectId.delete._index/route.action.ts`
  - Member invite / remove → `routes/_protected.$teamId.members.add._index/route.action.ts`, `routes/_protected.$teamId.members.remove._index/route.action.ts`
  - Checkout metadata stamping → `routes/_protected.$teamId.billing._index/route.loader.ts`
  - PostHog identifier mount (team + project groups) → `routes/_protected.$teamId/route.component.tsx`
- **Backfill** (`backfill/`, local-only, gitignored) replays history into PostHog. Tasks: `group-state`, `signups`, `teams-created`, `projects`, `team-members`, `conversions`, `plan-changes`. Add a task + register it in `run.ts` whenever you add a backfillable event. See `backfill/README.md`.

If you're adding a new **subscription**-lifecycle event, the analytics belongs in `subscription-lifecycle-tracking.ts`. If you're adding a new **user**-lifecycle event (team/project/membership/signup), it belongs in `lifecycle-tracking.ts`. Either way, don't sprinkle `captureServerEvent` calls across unrelated route handlers — the consolidation is intentional.

## Checklist for adding a new tracked event

- [ ] Event name is **snake_case, action-oriented** (`customer_converted`, not `userConvertedToCustomer`).
- [ ] `distinctId` resolves to a real `auth.users` id (browser: `user.id`; server: `teams.created_by`).
- [ ] `teamId` is passed when the event is team-scoped; `projectId` too when it's project-scoped.
- [ ] Subscription event → `subscription-lifecycle-tracking.ts`; user-lifecycle (team/project/membership/signup) → `lifecycle-tracking.ts`. Not sprinkled in the route handler.
- [ ] `dedupeKey` is `deterministicUuid("<event_name>:<stable_entity_id>")`.
- [ ] `timestamp` reflects when the event *occurred*, not when it was ingested.
- [ ] Properties include `team_id`, `stripe_customer_id` (if billing), `subscription_id` (if subscription-related).
- [ ] If conversion-style, also include `price`, `currency`, and ad attribution via `adAttributionProps(subscription.metadata)`.
- [ ] Call site is `try {…} catch {…}` so analytics failures can't take down the handler.
- [ ] `system_triggered: true` is set **only** if the event was fired by automation (cron/scheduled task).
- [ ] `references/event-catalog.md` updated as part of the same PR.
- [ ] If the event is backfillable from existing data, add/extend a `backfill/` task and register it in `run.ts`.
- [ ] If the event should reach Meta/Google: confirm the destination's "Match events" filter includes it, and check `references/destination-mappings.md` for what properties each destination reads.

## Anti-patterns — refuse these

- Firing paid-lifecycle events from a browser button handler. (Misses support-driven changes, dunning cancellations, automated upgrades.)
- Setting `timestamp` to `new Date()` on a webhook handler. (A retried 5-minute-old Stripe event would land at the wrong time.)
- Reading person properties (`gclid`, `fbclid`) directly from PostHog inside a server handler — they're not in scope there. Source from `subscription.metadata` (set at checkout).
- Treating `trialing` as a paid conversion if/when trials are introduced. Current code does because we don't offer trials; add a separate `trial_started` event and redefine `customer_converted` as first *paid* subscription when that changes.
- Using a random `uuid` as the dedupe key. PostHog dedup requires determinism; randoms allow doubles.
- Cross-sibling imports — vendor the helper into each sibling instead.
- Adding new tier-ordinal columns or indices. Use `plan_post_limit` for ordering.
- Inventing a `role` column / table to populate the `role` property. It's derived from `teams.created_by` (`roleForTeam`). Schema changes for analytics are out of scope here.
- Firing `team_member_joined` at invite time. It's a seat-*activation* signal (existing user added, or invited user's first auth) — invite time is `team_member_invited`.

## When to escalate to the user

Ask before doing — these are not defaults:

- Adding a browser-side `fbq('track', …)` or `gtag('event', …)` for conversions. (We deliberately fire conversions only via PostHog → destinations, no browser dedup work.)
- Adding new PostHog destinations or modifying their event-name / property mappings. (Lives in PostHog UI, not the codebase, but affects what properties events must carry.)
- Adding `historical_migration: true` semantics or backdating to events older than ~1 year.
- Introducing a non-Stripe source for a paid-lifecycle signal.

## References

- `references/event-catalog.md` — canonical list of currently tracked events with the properties each carries. **Update with every PR that adds or modifies an event.**
- `references/destination-mappings.md` — what each PostHog destination reads (Meta CAPI, Google Ads). Useful when adding a new event that should reach an ad platform.
