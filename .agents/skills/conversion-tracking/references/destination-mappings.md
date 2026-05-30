# PostHog destination mappings

What each forward-to-ad-platform destination reads from PostHog. Useful when adding/modifying destinations or when introducing new properties that destinations need to see. The destinations themselves live in the PostHog UI (not in this repo), but the property names they read **dictate what our events and identify calls must set**.

## Meta Ads — Conversions API

Reads primarily from `person.properties`, plus a few `event.properties`.

| Meta field | PostHog source |
|---|---|
| `em` (hashed email) | `sha256Hex(lower(person.properties.email))` |
| `fn` (hashed first name) | `sha256Hex(lower(person.properties.first_name))` |
| `ln` (hashed last name) | `sha256Hex(lower(person.properties.last_name))` |
| `fbc` (click id) | `person.properties.fbc` (preferred) — falls back to constructing from `person.properties.fbclid` |
| `fbp` (browser id) | `person.properties.fbp` |
| `client_user_agent` | `event.properties.$raw_user_agent` |
| `event_source_url` | `event.properties.$current_url` |
| `custom_data.value` | `event.properties.price` |
| `custom_data.currency` | literal `USD` (or `event.properties.currency`) |
| `event_name` | **Literal `Subscribe`** (a Meta standard event). Do **not** leave at `{event.event}` — that would send `customer_converted` as a custom event and lose standard-event optimization. |
| `event_id` | `event.uuid` (we set via `deterministicUuid` so PostHog dedupe and Meta dedupe stay aligned) |

### Match filter
`event = customer_converted`. To add another event that should also reach Meta (e.g. `subscription_reactivated`), add a second event matcher in the destination config or duplicate the destination.

## Google Ads — Conversion API

| Google field | PostHog source |
|---|---|
| Conversion Action | The Google Ads conversion action ID (set in destination UI). |
| Google Click ID (`gclid`) | `person.properties.gclid ?? person.properties.$initial_gclid` |
| Conversion Date Time | `formatDateTime(toDateTime(event.timestamp), '%Y-%m-%d %H:%i:%S')` |
| Conversion value | `event.properties.price` |
| Currency code | `USD` |
| Order ID | (optional) — a stable id per conversion; if set, also enables Google-side dedupe |

### Match filter
`event = customer_converted`.

## What this means for new events

If you want a new event to reach Meta or Google for conversion measurement:

1. **Fire after `identify`**, so the user's person properties are already set (the destinations primarily read those).
2. **Include `price` + `currency` on the event** — both destinations consume these as the conversion value.
3. **Include `$current_url` + `$raw_user_agent` on the event** (sourced from `subscription.metadata` for server-side events) — Meta uses these for matching.
4. **Add the event to the destination's "Match events"** filter in PostHog, or duplicate the destination per event.
5. If it's a Meta-standard event, set the destination's `event_name` to the literal Meta name (`Subscribe`, `Lead`, `CompleteRegistration`, etc.), not `{event.event}`.

## Things that are intentionally not destinations

- A separate destination for `user_signed_up` → Meta `CompleteRegistration` could be added later if the upper-funnel signal is wanted. No code change needed; just a new PostHog destination.
- Browser pixel `fbq('track', 'Subscribe')` / `gtag('event', 'conversion')` — deliberately not fired to avoid dedup work. The PostHog destination is the single source for conversions.

## Reminders for maintaining destinations

- The Meta destination requires the **Pixel ID** + **CAPI access token** (set in PostHog UI; not in our env).
- The Google destination requires the **Google Ads conversion action ID** (set in PostHog UI).
- Before running the historical backfill (`backfill/` — local only), **pause the destinations** so months-old events don't dump into Meta/Google with timestamps outside their attribution windows (Meta: 7-day click; Google: 90-day default).
