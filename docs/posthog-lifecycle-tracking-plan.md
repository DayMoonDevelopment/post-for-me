# PostHog Customer Lifecycle Tracking — Implementation Plan

Track the full funnel in PostHog with a **person = user / group = team** model:

```
discovery (marketing)  →  user creation (dashboard)  →  subscription start  →  upgrade/downgrade  →  cancellation
   anonymous $pageview      identify() + user_signed_up    customer_converted     subscription_upgraded   subscription_canceled
```

All paid-lifecycle signals are sourced from **Stripe webhooks**, never from in-app button clicks — that is what guarantees we capture changes made by a support agent in the Stripe dashboard, by the automated upgrade flow, or by dunning, not just changes a user makes in our UI.

---

## 1. Identity model (the foundation — do this first)

PostHog **person = an individual user** (`distinct_id` = Supabase auth user id).
PostHog **group `team` = the billing entity** (`group key` = `teams.id`).

### Distinct-id consistency rule (non-negotiable)
- **Browser** (`posthog-js`): `posthog.identify(user.id, …)` where `user.id` is the Supabase auth uid.
- **Server** (`posthog-node`, in the Stripe webhook): `distinctId` = `teams.created_by`, which **is** a Supabase auth uid.
- These must be the same value so server billing events land on the same person as browser pageviews. They match for the team creator. Multi-user teams attribute the billing *event* to the creator; the org-level truth lives on the `team` **group**, which is the correct model for B2B billing.

### Anonymous → identified stitching (discovery → signup)
- Marketing is anonymous (no auth). With `person_profiles: "identified_only"`, those `$pageview`s are recorded against an anonymous `distinct_id`.
- When the user later signs in on the dashboard and we call `identify(user.id)`, PostHog back-links the prior anonymous events **only if the anonymous `distinct_id` survived the marketing → dashboard hop.**
- That requires two things:
  1. **Same PostHog project** for marketing and dashboard. ⚠️ Verify both apps' `POST_HOG_API_KEY` point to the same project.
  2. **Cross-subdomain cookie persistence** so `postforme.dev` (marketing) and `app.postforme.dev` (dashboard) share one anonymous id. Add `cross_subdomain_cookie: true` (and `persistence: "localStorage+cookie"`) to **both** `posthog.init` calls.
- Free attribution bonus: the SDK auto-captures `$initial_referrer` / `utm_*` as person properties, so discovery attribution comes along for the ride once stitching works.

---

## 2. Event taxonomy

| Stage | Event | Source / seam | Notes |
|---|---|---|---|
| Discovery | `$pageview` (autocapture) | `posthog-js` (marketing + dashboard) | No code beyond cross-subdomain config |
| User creation | `user_signed_up` | **server** — `_auth.sign-in.otp.verify._index/route.action.ts` | Only on first-time creation (see detection below) |
| (every session) | `identify()` + `group("team", …)` | **browser** — new `PostHogIdentifier` at `_protected.$teamId` | Runs once per authenticated team session |
| Subscription start | `customer_converted` | **server** — dashboard Stripe webhook | First time the customer reaches `active`/`trialing` (no prior real subscription) |
| Reactivation | `subscription_reactivated` | **server** — dashboard Stripe webhook | Becomes active again after a prior real subscription (churn → return) |
| Upgrade | `subscription_upgraded` | **server** — dashboard Stripe webhook (`subscription.updated`) | Tier index increased |
| Downgrade | `subscription_downgraded` | **server** — same | Tier index decreased |
| Cancel requested | `subscription_cancel_scheduled` | **server** — `subscription.updated`, `cancel_at_period_end` flips true | Captures intent at request time |
| Cancel effective | `subscription_canceled` | **server** — `subscription.deleted` | Access actually ended |
| Auto-upgrade scheduled | `subscription_upgrade_scheduled` | **trigger** — `process-usage-limits.ts` (usage cron) | System-driven; carries `system_triggered: true`. Pairs with the later `subscription_upgraded` when the schedule activates. |

### Attribution & the `system_triggered` flag

Billing events are **team-level** — report on them via PostHog **group analytics (unique `team` groups)**, not unique users. Every event still needs a `distinct_id` (PostHog has no person-less events), so server/cron events attribute to `teams.created_by`; the `team` group is the unit you actually slice by. A single user joining multiple teams is handled naturally — same person, different `team` groups.

"Who triggered it" is a **property, not the distinct_id**: only system-driven events carry `system_triggered: true`. Absence implies human-driven — so nobody has to remember to stamp every event, and the failure mode leans to the common case. (Caveat: a webhook `subscription_upgraded` that *activates* an auto-scheduled upgrade is unflagged; to measure automation→activation, join `subscription_upgrade_scheduled`→`subscription_upgraded` on `subscription_id`.)

**`team` group properties** maintained on every subscription webhook event (state, not just events — self-healing):
`subscription_status`, `plan_name`, `plan_post_limit`, `plan_price`, `is_active`, `cancel_at_period_end`.

Common event properties: `team_id`, `stripe_customer_id`, `subscription_id`, `plan_name`, `plan_post_limit`, `is_legacy`, and for plan changes `from_post_limit` / `to_post_limit`.

**Plan ordering:** plans are ordered by **post limit** (the number of posts a plan allows) — that's how tiers are distinguished internally, so a higher limit = upgrade. Upgrade/downgrade direction compares the new plan's post limit to the prior one (read from `previous_attributes.items`). Products that don't map to a pricing tier (legacy/unknown) resolve to `null` and are skipped.

---

## 3. Why the dashboard webhook (not the API mirror) for paid events

- The **dashboard webhook** (`/api/stripe.webhook`) already resolves `stripe_customer_id → teams` (giving `created_by` + `team_id` for attribution) and receives `subscription.created/updated/deleted` — which Stripe fires regardless of trigger source.
- The **API webhook** (`/private/webhooks/stripe`) is a pure, replayable `stripe.*` mirror. Emitting analytics there would double-fire on every `stripe:sync` replay and violate its single responsibility.
- **Out of scope here (genuinely backend-sourced, future phase):** refunds (`charge.refunded`) are only seen by the API mirror, and the `subscription_schedule` object (the automated-upgrade artifact) is only mirrored by the API. Those belong to a later phase sourced from the mirror + a reconcile job, not the dashboard webhook.

---

## 4. Phased changes

### Phase 0 — Identity foundation
1. **Cross-subdomain config** in both `posthog.init` calls:
   - `dashboard/app/providers/posthog-provider.tsx`
   - `marketing/app/providers/posthog-provider.tsx`
   - Add `cross_subdomain_cookie: true`, `persistence: "localStorage+cookie"`.
2. **`posthog-node` in `dashboard/`**: `cd dashboard && bun add posthog-node`.
3. **Server wrapper** `dashboard/app/lib/.server/posthog.ts`:
   - Singleton `PostHog` client guarded on env presence (no-op if `POST_HOG_API_KEY`/`HOST` unset, mirroring the browser provider).
   - `captureServerEvent({ distinctId, event, properties, groups })` and `setTeamGroupProps(teamId, props)` helpers.
   - **Always `await client.flush()`** after capture (serverless freezes before the background flush). Set `$insert_id` = Stripe `event.id` for dedupe on Stripe retries.
4. **`PostHogIdentifier` component** (`dashboard/app/components/posthog-identifier.tsx`), mounted in `_protected.$teamId/route.component.tsx`. Reads `useRouteLoaderData("routes/_protected.$teamId")` (already exposes `user` + `team`) and in a `useEffect` keyed on `user.id`/`team.id`:
   ```ts
   posthog.identify(user.id, { email: user.email, created_at: user.created_at });
   posthog.group("team", team.id, { name: team.name, stripe_customer_id: team.stripe_customer_id });
   ```

### Phase 1 — Signup + conversion
5. **`user_signed_up`** in `_auth.sign-in.otp.verify._index/route.action.ts`, alongside the existing fire-and-forget `syncUserToLoops(verify.data.user)`. Supabase's `verifyOtp` returns **no "newly created" flag**, so detect first-time signup by `Date.now() - new Date(user.created_at) < ~60s` (or add a DB trigger / `user_signups` table if we want certainty). Capture server-side with `distinctId = user.id`.
6. **`customer_converted`** — extend `dashboard/app/routes/api.stripe.webhook/.server/subscription-event.ts` (and branch on `event.type` in `route.action.ts`, since the handler is currently shared across created/updated/deleted):
   - Resolve team from `stripe_customer_id` (read `team_id`, `created_by`).
   - Resolve the team from `subscription.metadata.team_id` (stamped at checkout via `subscription_data.metadata`) first, falling back to the `stripe_customer_id` lookup — this avoids dropping a brand-new customer's conversion when the webhook beats the post-checkout redirect that links the customer id.
   - Fire `customer_converted` when the subscription **reaches `active`/`trialing`** and the customer has **no prior real subscription**; if a prior real subscription exists (churn → return), fire `subscription_reactivated` instead. Abandoned `incomplete` subs don't count as prior. Keying off status (not the raw `.created`) avoids firing on `incomplete` subs that never pay.
   - Set the `team` group state properties.

### Phase 2 — Upgrade / downgrade / cancellation
7. On `customer.subscription.updated` in the dashboard webhook:
   - Map current product → **post limit** via `PRICING_TIERS` (`stripe.constants.ts`); products that don't map (legacy/unknown) resolve to `null` and are skipped.
   - Classify direction by comparing the new post limit to the prior one, read from `event.data.previous_attributes.items` (Stripe includes the prior item in full — confirmed in testing, so no `teams` column is needed). Emit `subscription_upgraded` / `subscription_downgraded`.
   - If `cancel_at_period_end` flips `true` (visible in `previous_attributes`), emit `subscription_cancel_scheduled`.
   - Refresh `team` group state props every time.
8. On `customer.subscription.deleted`: emit `subscription_canceled`, set group `is_active=false`, `subscription_status="canceled"`.

### Phase 2.5 — Automated upgrade (DONE)
- `subscription_upgrade_scheduled` emitted from `trigger/process-usage-limits.ts` at both schedule decision points (first schedule + escalation). Vendored `posthog-node` copy at `trigger/posthog.ts` (dumb-monorepo rule — no shared package). Attributes to `teams.created_by` + `team` group, `system_triggered: true`, dedupe keyed on `subscription.id` + target tier. Requires `POST_HOG_API_KEY`/`HOST` in the trigger.dev env (same project).

### Phase 3 — Backend-sourced (future, noted only)
- Refunds (`charge.refunded`) from the **API mirror** with `$insert_id = event.id`.
- **Reconcile job** that reads `stripe.*` and re-asserts each `team` group's `subscription_status`/`is_active`, so any missed discrete event self-corrects.

---

## 5. Operational notes
- **`.env.production` PostHog keys are currently blank** in dashboard (and marketing) — server + browser capture silently no-op until populated in the deploy env.
- Reuse the existing `POST_HOG_API_KEY` / `POST_HOG_API_HOST` server-side; no new secrets. **`trigger/` now needs these too** (set in the trigger.dev cloud env, same project as dashboard/marketing).
- Capture is **fire-and-forget** in webhook handlers (return 200 fast; never let a PostHog failure break Unkey/sync side effects).

## 6. Open items to confirm
- [ ] Marketing and dashboard `POST_HOG_API_KEY` point to the **same** PostHog project.
- [ ] Actual production domains share a parent (`*.postforme.dev`) for the cross-subdomain cookie.
- [ ] Acceptable to attribute team-level billing events to `teams.created_by` (vs. acting user) — recommended.
- [ ] First-signup detection: `created_at` heuristic vs. a dedicated DB trigger/table.
</content>
