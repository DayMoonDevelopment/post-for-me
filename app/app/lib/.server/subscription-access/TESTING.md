# Testing the Stripe webhooks (sandbox + CLI)

Covers both routes: `/webhook/stripe/subscription-access` and
`/webhook/stripe/customer-link`. Every row is a distinct code path.

## Setup

**Env** — dev server needs `STRIPE_SECRET_KEY` (sandbox), `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UNKEY_ROOT_KEY`,
`UNKEY_API_ID`, plus both webhook secrets.

The CLI has ONE signing secret per account (verified — `--print-secret` returns
the same value every time), so locally BOTH secrets are that value:

```sh
SECRET=$(stripe listen --print-secret | tail -1)
# STRIPE_WEBHOOK_SECRET_SUBSCRIPTION_ACCESS=$SECRET
# STRIPE_WEBHOOK_SECRET_CUSTOMER_LINK=$SECRET
```

In production they are two different endpoint secrets — that difference is
covered by rows A3/E3.

**Listeners** — one command starts both, each filtered to its own route's
events, forwarded through Caddy to `https://app.postforme.foo`:

```sh
bun run stripe:webhook       # ^C stops both (trap 'kill 0')
```

Requires `caddy run` and the dev server on :7361 (see the repo-root Caddyfile).
Stripe's CLI trusts Caddy's local CA via the system store, so no `--skip-verify`
is needed — verified with a real `customer.created` delivery returning
`<-- [200] POST https://app.postforme.foo/webhook/stripe/customer-link`.

**Fixture** — the handler resolves a team by `stripe_customer_id`, so
`stripe trigger`'s throwaway customers only exercise matrix A. Everything B–F
needs is scripted:

```sh
bun run test:fixture          # team_TEST936 + 2 projects + 2 Unkey keys + Stripe customer
bun run test:state            # print link, subscriptions, and every key's enabled + plan_*
bun run test:fixture:reset    # remove all of it
```

The team is created **unlinked** on purpose — row E7 links it, which doubles as
the setup for group B. The Stripe customer gets `pm_card_visa` as its default
payment method, without which a new subscription lands `incomplete` (not
entitling) and group B would test the wrong thing.

Sandbox ids (from `bun run test:fixture`):

| what | id |
| --- | --- |
| team | `team_TEST936` |
| white-label project | `proj_TEST936WL` |
| quickstart project | `proj_TEST936SYS` |
| Pro 1K price | `price_1ScvNdPsFI1FlQSqVwyIxz4B` |
| Pro 2.5K price | `price_1ScvO0PsFI1FlQSqGENjsVi8` |
| Managed System Credentials price | `price_1RqK4cPsFI1FlQSqEX4WbxgV` |
| legacy "Social Post API Usage" price | `price_1RTm2tPsFI1FlQSqrk0Eudvz` |

**Gotchas that will silently corrupt a run:**

- **Port collision.** If :7361 is already held, Vite quietly binds :7362 and Caddy
  keeps routing `app.postforme.foo` to the *stale* server. Negative rows then
  "pass" against the wrong process. Check the `Local:` line says 7361, or
  `lsof -ti tcp:7361 -sTCP:LISTEN` before starting.
- **Bun/Node don't trust Caddy's CA.** A test script calling
  `https://app.postforme.foo` fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`
  unless you export
  `NODE_EXTRA_CA_CERTS="$HOME/Library/Application Support/Caddy/pki/authorities/local/root.crt"`.
  (Stripe's CLI is Go and uses the system store, so it needs nothing.)
- **Rows A1/E1 need the secret EMPTY, not absent** — `.env` supplies it, so run
  `STRIPE_WEBHOOK_SECRET_SUBSCRIPTION_ACCESS= bun run dev` to override.

**Observing results** — the dev server logs one line per delivery:
`[webhook/stripe/subscription-access] <event> → team <id>: access enabled/disabled, N key(s) updated across M project(s)`.
For key state, list by `externalId = projectId` in Unkey and read `enabled` +
`meta`.

> Unkey may serve a cached verification for a few seconds after a key flips.
> When checking F1/F2, retry once before calling it a failure.

---

## Run order

`CUS` below is the fixture customer id printed by `bun run test:fixture`.
Run `bun run test:state` after every row.

**E first** — E7 links the team, which sets up group B.

```sh
# E5  no team_id → 200, nothing changes
stripe trigger customer.created

# E6  unknown team → 200 + warn, nothing changes
stripe customers create -d "metadata[team_id]=team_nope"

# E7  links the fixture team
stripe customers update $CUS -d "description=link test"
#     → test:state shows stripe_customer_id = $CUS

# E8  redelivery → no second write (no log line)
stripe customers update $CUS -d "description=link test again"

# E9  a SECOND customer for the same team must NOT steal the link
stripe customers create -d "metadata[team_id]=team_TEST936"
#     → test:state still shows the ORIGINAL $CUS.  Then: stripe customers del <new_cus>
```

**B — access state machine** (watch `proj_TEST936WL`)

```sh
# B1  subscribe → both keys ENABLED, plan_type=new_pricing, plan_post_limit=1000
stripe subscriptions create -d customer=$CUS -d "items[0][price]=price_1ScvNdPsFI1FlQSqVwyIxz4B"

# B7  idempotency: re-send that event from the Stripe dashboard → "0 key(s) updated"

# B4  tier change → plan_post_limit becomes 2500  (this is D4)
stripe subscriptions update <sub> -d "items[0][id]=<item>" -d "items[0][price]=price_1ScvO0PsFI1FlQSqGENjsVi8"

# B2  cancel → both keys DISABLED
stripe subscriptions cancel <sub>

# B3  resubscribe → ENABLED again
stripe subscriptions create -d customer=$CUS -d "items[0][price]=price_1ScvNdPsFI1FlQSqVwyIxz4B"

# B5  trialing entitles
stripe subscriptions create -d customer=$CUS -d "items[0][price]=price_1ScvNdPsFI1FlQSqVwyIxz4B" -d trial_period_days=7
```

**C — system vs white-label divergence** (the important group)

```sh
# C2  legacy/non-tier only → WL enabled, SYS disabled
stripe subscriptions cancel <any active sub>
stripe subscriptions create -d customer=$CUS -d "items[0][price]=price_1RTm2tPsFI1FlQSqrk0Eudvz"
#     → test:state: proj_TEST936WL ENABLED, proj_TEST936SYS DISABLED

# C3  add the managed-credentials line item → SYS enabled too
stripe subscriptions update <sub> -d "items[1][price]=price_1RqK4cPsFI1FlQSqEX4WbxgV"
```

**F — acceptance** (needs the API on :7360)

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://api.postforme.foo/v1/social-posts \
  -H "Authorization: Bearer <the pfm_live key for proj_TEST936WL>"
#  subscribed → 200 ;  after cancel → 401 ;  after resubscribe → 200
```

---

## A. Transport & plumbing — `subscription-access`

No fixture needed. Sign payloads by hand or use `stripe trigger`.

| # | Scenario | Expect |
| --- | --- | --- |
| A1 | Unset `STRIPE_WEBHOOK_SECRET_SUBSCRIPTION_ACCESS`, POST anything | `500 Webhook not configured` |
| A2 | POST with no `stripe-signature` header | `400 Missing stripe-signature header` |
| A3 | Sign with the OTHER route's secret | `400 Invalid signature` |
| A4 | Valid signature, unhandled type (`stripe trigger charge.succeeded`) | `200 Ignored` |
| A5 | Valid signature, handled type, payload has no `customer` | `200 No customer on event`, warn logged |
| A6 | Handled event for a customer with no team (`stripe trigger customer.subscription.deleted`) | `200 OK`, log says `team none`, no keys touched |

## B. Access state machine

Fixture customer + linked team. Watch the white-label project's key.

| # | Transition | How | Expect |
| --- | --- | --- | --- |
| B1 | none → subscribed | `stripe subscriptions create` on a tier price | keys **enabled**; meta gains `plan_type=new_pricing`, `plan_name`, `plan_post_limit`, `plan_product_id` |
| B2 | subscribed → canceled | `stripe subscriptions cancel <sub>` | keys **disabled** |
| B3 | canceled → resubscribed | create a new subscription | keys **re-enabled** |
| B4 | active → past_due | card `4000 0000 0000 0341` as default PM + short trial, then advance a **test clock** past trial end | `invoice.payment_failed` → keys **disabled** |
| B5 | trialing | `stripe subscriptions create … -d trial_period_days=7` | keys **enabled** (trialing entitles) |
| B6 | paused → resumed | pause/resume the subscription | disabled, then enabled |
| B7 | redelivery | resend any B-row event | `200 OK`, **0 keys updated** (idempotent + `isUpToDate` skip) |

## C. System (quickstart) projects — the add-on branch

Watch **both** projects' keys; they must diverge.

| # | Scenario | Expect |
| --- | --- | --- |
| C1 | Active current tier | white-label **enabled**, system **enabled** (tiers bundle managed creds) |
| C2 | Active **non-tier** subscription, no add-on line item | white-label **enabled**, system **disabled** ← the over-granting guard |
| C3 | Same as C2 plus a "Managed System Credentials" line item | both **enabled** |
| C4 | Temporarily remove `social_post_limit` from all tier products in the sandbox, then fire any handled event | catalog yields 0 tiers → system project **untouched** (not disabled), white-label still follows status. Restore metadata after. |

## D. Plan metadata stamping

| # | Scenario | Expect |
| --- | --- | --- |
| D1 | Subscribe to a tier | key meta has all four `plan_*` fields matching the product |
| D2 | Subscription where the **add-on is the first line item** and the tier is second | plan meta still comes from the **tier** ← regression test for line-item ordering |
| D3 | Key created with `created_by` / `created_by_label` | those survive the sync (meta is merged, not replaced) |
| D4 | Change tier (e.g. Pro 1K → Pro 5K) | `plan_post_limit` and `plan_name` update |

## E. `customer-link`

| # | Scenario | Expect |
| --- | --- | --- |
| E1 | Unset `STRIPE_WEBHOOK_SECRET_CUSTOMER_LINK` | `500 Webhook not configured` |
| E2 | No signature | `400` |
| E3 | Sign with the subscription-access secret | `400 Invalid signature` |
| E4 | `stripe trigger invoice.paid` (unhandled here) | `200 Ignored` |
| E5 | `stripe customers create` with no `metadata.team_id` | `200 OK`, no DB write |
| E6 | `metadata.team_id` pointing at a nonexistent team | `200 OK` + warn, no write |
| E7 | Team with `stripe_customer_id = NULL`, customer carries its `team_id` | column **populated**, "linked" logged |
| E8 | Redeliver E7's event | `200 OK`, no second write ("already-linked") |
| E9 | Team already linked to `cus_A`; fire `customer.updated` for `cus_B` with the same `team_id` | link **unchanged** (write is `WHERE stripe_customer_id IS NULL`) |

## F. End-to-end acceptance — the actual revenue leak

The only rows that prove the feature. Run against the real API with a
`pfm_live` key from the fixture project.

| # | Step | Expect |
| --- | --- | --- |
| F1 | While subscribed: `curl -H "Authorization: Bearer pfm_live_…" https://api.postforme.foo/v1/social-posts` | `200` |
| F2 | Cancel the subscription, wait for the webhook, repeat the call | **`401`** |
| F3 | Resubscribe, repeat | `200` again |

## Not covered by this matrix

- Key pagination beyond 100 per project (`for await` loop) — needs a bulk fixture
- `failedProjects > 0` → `500 Partial failure` — needs Unkey to fail mid-sweep
- Live-mode endpoint secrets differing — only provable in production
