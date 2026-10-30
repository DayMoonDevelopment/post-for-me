# Tracking — dashboard

All browser-side conversion/attribution wiring for the dashboard lives here.

**Source-of-truth split:** paid-lifecycle / conversion EVENTS (`user_converted`,
`team_billing_completed`, subscription lifecycle) are emitted **only by the API**
from its Stripe webhook — never from the dashboard. The dashboard's job is to
(a) set up the person + `team` group so those server events attribute correctly,
and (b) carry ad-match cookies. It fires no conversion events itself.

| File | Responsibility |
|---|---|
| `posthog-provider.tsx` | Initializes `posthog-js` with `person_profiles: "always"` + `cross_subdomain_cookie` so PostHog auto-captures first-touch ad attribution (`$initial_gclid`, …) as person properties. Mounted in `app/root.tsx`. |
| `posthog-identifier.tsx` | `identify(user.id, …)` + `group("team", team.id, …)` once per authenticated session. Mounted by `AppShell` (`app/components/shell/app-shell.tsx`), so every authenticated shell identifies identically. |
| `pixels.tsx` | Mounts the ad pixels in `<head>` (each gated on its env id). Mounted in `app/root.tsx`'s `Layout`. |
| `meta-pixel.tsx` | Meta Pixel loader — init + `PageView` only (sets `_fbc`/`_fbp`). No conversion firing. Env: `VITE_META_PIXEL_ID`. |
| `google-ads-tag.tsx` | gtag.js loader + base config only. No conversion firing. Env: `VITE_GOOGLE_ADS_TAG_ID`. |

There is **no attribution cookie** — PostHog's own `$initial_*` capture replaced
the old `pfm_attribution` cookie.

## Checkout / billing (not in this folder)

- `app/routes/protected/redirect.teams.$teamId.checkout._index/route.action.ts` — creates the
  Stripe Checkout / portal session and 302s (the `api.*` sibling returns the same `{ url }` as
  data). Stamps `subscription_data.metadata.team_id` so the API webhook can map the subscription
  → team → user.
- `app/routes/protected/callback.teams.$teamId.checkout._index/route.loader.ts` — Stripe's
  `success_url` return; links `teams.stripe_customer_id` then redirects into the launchpad tour.

## Conversion events (API, not here)

The API's Stripe webhook is the sole emitter. See the API repo's
`src/private/webhooks/stripe/CONVERSION-TRACKING.md`.
