# Tracking — marketing

All conversion-tracking code for the marketing site lives in this directory.

| File | Responsibility |
|---|---|
| `posthog-provider.tsx` | Initializes `posthog-js` with cross-subdomain cookie config so the anonymous distinct id carries over to the dashboard on identify. |
| `pixels.tsx` | One-line wrapper that mounts both ad pixels in `<head>`. |
| `google-ads-tag.tsx` | `gtag.js` loader. Env: `GOOGLE_ADS_TAG_ID`. |
| `meta-pixel.tsx` | Meta Pixel `fbq` loader + `PageView` + `<noscript>` fallback. Env: `META_PIXEL_ID`. |
| `attribution-capture.tsx` | Client effect that on first load reads `gclid`/`fbclid`/`utm_*` from the URL and writes them to a `.postforme.dev`-scoped `pfm_attribution` cookie. The dashboard reads this cookie at checkout to stamp attribution onto the Stripe subscription so the conversion webhook can enrich the `customer_converted` event. |

All of these are mounted from `app/root.tsx`.

## Env vars

```
POST_HOG_API_KEY      POST_HOG_API_HOST     # browser
GOOGLE_ADS_TAG_ID     META_PIXEL_ID          # browser pixels (same value as dashboard)
```
