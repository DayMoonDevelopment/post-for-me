# Event catalog

Authoritative list of currently tracked PostHog events. **Update this file in the same PR whenever you add, remove, or rename an event** — the SKILL.md checklist points here.

## Browser identity (not events, but identity wiring)

| Call | Where | Properties |
|---|---|---|
| `posthog.identify(user.id, …)` | `dashboard/app/tracking/posthog-identifier.tsx` | `email`, `created_at`, `first_name`, `last_name`, `gclid`, `fbclid`, `fbc`, `fbp`, `utm_*` |
| `posthog.group("team", team.id, …)` | same | `name`, `stripe_customer_id`, `billing_email` |
| `posthog.group("project", project.id, …)` | same (fires only on project-scoped routes) | `name`, `team_id` |

PostHog SDK also auto-captures `$initial_referrer`, `$initial_utm_*`, `$initial_gclid`, `$initial_fbclid` as person properties on the first identified pageview.

### Group types

Two PostHog group types are defined: **`team`** (the billing entity, keyed by `teams.id`) and **`project`** (keyed by `projects.id`). A user acts on behalf of one project at a time; project-scoped events/pageviews attach both groups so they roll up to the team *and* the project. PostHog allows up to 5 group types — adding more (e.g. `social_account`) is possible but coordinate first.

## Lifecycle events

### `user_signed_up`

| | |
|---|---|
| Fires | First-time signup (account `created_at` < 60s ago) |
| Source | `dashboard/app/routes/_auth.sign-in.otp.verify._index/route.action.ts` |
| distinct_id | `user.id` |
| team group | **Invited user** (`user_metadata.source.type === "invite"`): the team they were invited to (`source.team`). **Organic**: the personal team auto-created at signup (`teams.created_by = user.id`). |
| properties | `email`, `team_id`, `role` (`owner` organic / `member` invited), `invited_by` (invited only) |
| timestamp | now |
| dedupe | `user_signed_up:<user.id>` |

`role` is **derived**, not stored — there is no `role` column on `team_users`. The team's `created_by` is the `owner`; everyone else is a `member`. See `roleForTeam()` in `tracking/.server/lifecycle-tracking.ts`. If a real roles system is ever added, replace the derivation with a column read everywhere it's used.

## Team & project lifecycle events

These are **user-lifecycle** events: they fire from in-app route actions (not the Stripe webhook), via `dashboard/app/tracking/.server/lifecycle-tracking.ts`. Each is wrapped fire-and-forget at the call site so a tracking failure can't break the action.

### `team_created`

| | |
|---|---|
| Fires | A team (billing unit) comes into existence — organic signup's auto-team, or explicit "create team" |
| Source | OTP verify (`creation_context: "signup"`) + `routes/api.teams.new/route.action.ts` (`creation_context: "manual"`) |
| distinct_id | `team.created_by` (the owner) |
| team group | `team.id` |
| properties | `team_id`, `created_by_user_id`, `creation_context`, `plan_name` (null at creation) |
| dedupe | `team_created:<team.id>` |
| Note | Live skips invited users' throwaway personal auto-teams; the backfill replays the whole table (dedupe keeps it idempotent). Also seeds `member_count`/`project_count` on the group. |

### `project_created`

| | |
|---|---|
| Fires | A project is created — explicit project creation, **and** the default project auto-created with a team (treated as user-driven onboarding) |
| Source | `routes/_protected.$teamId.new._index/route.action.ts`, plus OTP verify + `api.teams.new` for the default project |
| distinct_id | acting user (`created_by`) |
| groups | `team` (`team_id`) **and** `project` (`project.id`) |
| properties | `project_id`, `project_name`, `team_id` |
| dedupe | `project_created:<project.id>` |
| Note | Refreshes the team group's `project_count`; sets `project` group props (`name`, `team_id`). |

### `project_deleted`

| | |
|---|---|
| Fires | A project is hard-deleted (may signal disengagement) |
| Source | `routes/_protected.$teamId.$projectId.delete._index/route.action.ts` |
| distinct_id | acting user |
| groups | `team` + `project` |
| properties | `project_id`, `team_id` |
| dedupe | `project_deleted:<project.id>` |
| Note | Live-only — projects are hard-deleted, so there's no row to backfill. Refreshes `project_count`. |

### `team_member_invited`

| | |
|---|---|
| Fires | An invite is sent (per invitee) |
| Source | `routes/_protected.$teamId.members.add._index/route.action.ts` |
| distinct_id | invitee `user.id` (so it pairs with `team_member_joined`) |
| team group | `team.id` |
| properties | `team_id`, `role` (`member`), `inviter_user_id`, `invitee_email`, `is_new_user` |
| dedupe | `team_member_invited:<team_id>:<invitee_user_id>` |

### `team_member_joined`

| | |
|---|---|
| Fires | A seat becomes active — an already-existing user is added (immediate) or an invited new user authenticates for the first time |
| Source | members.add (existing users) + OTP verify (invited new users) |
| distinct_id | the joining `user.id` |
| team group | `team.id` |
| properties | `team_id`, `role`, `invited_by` |
| dedupe | `team_member_joined:<team_id>:<user_id>` |
| Note | The team creator's own seat is **not** tracked here — it's covered by `team_created`. Refreshes `member_count`. |

### `team_member_removed`

| | |
|---|---|
| Fires | A member is removed (seat loss often precedes churn) |
| Source | `routes/_protected.$teamId.members.remove._index/route.action.ts` |
| distinct_id | the removed `user.id` |
| team group | `team.id` |
| properties | `team_id`, `role`, `removed_by_user_id`, `is_self_removal` |
| dedupe | `team_member_removed:<team_id>:<user_id>` |
| Note | Live-only (no historical record once the row is gone). Dedupe is `team:user`, so remove→re-invite→remove of the same user collapses to one event. Refreshes `member_count`. |

## Subscription lifecycle events (Stripe webhook)

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

## Notification events (Trigger.dev)

### `notification_sent`

| | |
|---|---|
| Fires | Any outbound notification is confirmed delivered on a channel (email status `sent` today) |
| Source | `trigger/process-team-notification.ts` → `trackNotificationSent`, on the real delivery moment |
| distinct_id | The **actual recipient**, resolved from the address sent to: the matching `users.id` if the email belongs to a user (so it merges with their browser-identified profile), else the email itself (external billing contact). **Not** the team owner. |
| team group | `team.id` (always attached — team reporting is group-aggregated regardless of recipient) |
| person props | `$set: { email }` — links the recipient (esp. an email-keyed, non-user contact) |
| Flag | `system_triggered: true` |
| properties (generic) | `channel` (`email`), `recipient_is_user` (whether the address mapped to a user), `notification_category` (`transactional`), `notification_type` (DB column, e.g. `usage_alert`), `notification_template` (`usage_limit_alert` / `usage_limit_upgrade`), `notification_id`, `usage_count`, `current_limit`, `plan_post_limit`, `suggested_plan_post_limit` |
| properties (channel-namespaced) | **email**: `email_provider` (`loops`), `email_template_id`. Future channels get their own prefix (`sms_*`, `push_*`). |
| timestamp | now (real-time send) |
| dedupe | `notification_sent:<team_id>:<channel>:<notification_template>:<period_start>:<suggested_plan_post_limit>` |
| Note | **One generic event for every outbound notification** — channel/category/type/template are properties, not distinct event names, so new emails *and* new channels (SMS/push) never proliferate events. Channel-specific details are namespaced by channel (`email_*`). The dispatcher (`process-team-notification.ts`) supplies `channel` + the namespaced props; the producer (`process-usage-limits.ts`) stamps `notification_category` + `notification_template` + a `tracking` block into `meta_data`. Only notifications with a `notification_template` emit this; untyped ones are skipped. Dedupe keys on channel + template + period + target tier, so a genuine escalation or a second channel still counts while a retried cron pass collapses. |

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
| `member_count` | Number of `team_users` rows for the team. Refreshed on team creation + member join/remove. |
| `project_count` | Number of `projects` for the team. Refreshed on team creation + project create/delete. |
| `created_at` | The team's real `teams.created_at`. Set so groups can be filtered by actual creation date — PostHog's own group "created" timestamp is just when the group was first registered (≈ backfill date for historical teams). |

`member_count` / `project_count` are refreshed via `refreshTeamShape()` in `tracking/.server/lifecycle-tracking.ts`. `groupIdentify` **merges** properties, so refreshing the shape never clobbers the billing-state props the subscription tracker sets (and vice versa).

## Project group properties

| Property | Meaning |
|---|---|
| `name` | Project display name |
| `team_id` | The team the project belongs to |
| `created_at` | The project's real `projects.created_at` (server-side only) — same rationale as the team group's `created_at`. |

Set browser-side (`posthog-identifier.tsx`) and server-side on `project_created` (`setProjectGroupProperties`).

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
