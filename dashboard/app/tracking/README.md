# Tracking — dashboard

All conversion-tracking code for the dashboard lives in this directory. If you
need to add to or audit how a user, team, conversion, or ad signal reaches
PostHog / Meta / Google, this is where to look.

## Browser-side

| File | Responsibility |
|---|---|
| `posthog-provider.tsx` | Initializes the `posthog-js` client with cross-subdomain cookie config. Mounted in `app/root.tsx`. |
| `posthog-identifier.tsx` | Calls `identify()` + `group("team", …)` once per authenticated session. Sets person properties the PostHog → Meta/Google destinations need (`email`, `first/last_name`, `gclid`, `fbclid`, `fbc`, `fbp`, `utm_*`). Mounted in `app/routes/_protected.$teamId/route.component.tsx`. |
| `pixels.tsx` | One-line wrapper that mounts both ad pixels. Mounted in `app/root.tsx`'s `<head>`. |
| `google-ads-tag.tsx` | `gtag.js` loader. Env: `GOOGLE_ADS_TAG_ID`. |
| `meta-pixel.tsx` | Meta Pixel `fbq` loader + `PageView` + `<noscript>` fallback. Env: `META_PIXEL_ID`. |
| `attribution.ts` | Reads `pfm_attribution` + Meta's `_fbc`/`_fbp` cookies from `document.cookie`. |

## Server-side (`.server/`)

| File | Responsibility |
|---|---|
| `posthog.ts` | `posthog-node` wrapper: `captureServerEvent`, `setTeamGroupProperties`, `deterministicUuid`. No-op when env unset; `await flush()` for serverless. |
| `attribution.ts` | Reads the same cookies from a server-side `Request`. |

## Where the wiring happens (outside this folder)

These route files import from `~/tracking/.server/…` to do the work:

- **Stripe webhook** — `app/routes/api.stripe.webhook/.server/subscription-lifecycle-tracking.ts`
  emits every paid-lifecycle event (`customer_converted`, `subscription_reactivated`,
  `subscription_upgraded`/`_downgraded`, `subscription_cancel_scheduled`,
  `subscription_canceled`) and refreshes the `team` group state on each event.
- **OTP verify** — `app/routes/_auth.sign-in.otp.verify._index/route.action.ts`
  emits `user_signed_up` for first-time signups.
- **Checkout** — `app/routes/_protected.$teamId.billing._index/route.loader.ts`
  stamps ad attribution + `_fbc`/`_fbp` + URL + UA into `subscription_data.metadata`
  so the webhook can attribute the conversion server-side and enrich it with
  what the PostHog destinations need.

## Env vars

```
POST_HOG_API_KEY      POST_HOG_API_HOST     # browser + server
GOOGLE_ADS_TAG_ID     META_PIXEL_ID          # browser pixels (both apps)
```
