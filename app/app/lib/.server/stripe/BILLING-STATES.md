# Billing states

Every state a team can actually be in. `bun run seed:billing` builds a local
fixture for **24 of the 29** — see [Coverage](#coverage) for the five it can't,
and why. Per-row `not seeded` marks the exceptions; everything else has a team.

---

## No subscription

| # | state | page shows | API keys |
| --- | --- | --- | --- |
| 1 | No customer, never subscribed | Empty · "Set up billing" | **enabled, permanently** ⚠️ |
| 2 | Customer exists, no live subscription | Empty · "Set up billing" | disabled |
| 3 | Checkout started, never paid (`incomplete`) | Empty · "Set up billing" | disabled |

---

## Legacy — metered, pay per post

No cap, so no usage bands: the number is a cost, not a fraction.

| # | state | page shows | API keys |
| --- | --- | --- | --- |
| 4 | Legacy, no add-on, **active** | legacy view · rate or tier bands · upgrade card · quickstart "Not included" | enabled; **quickstart project keys disabled** |
| 5 | Legacy, add-on, **active** | as above · quickstart "Included via add-on" | enabled, incl. quickstart |
| 6 | Legacy, no add-on, **cancel scheduled** | legacy view — **cancellation not shown** ⚠️ | enabled until it lapses |
| 7 | Legacy, add-on, **cancel scheduled** | as above — **not shown** ⚠️ | enabled until it lapses |
| 8 | Legacy, no add-on, **canceled** | Empty · "Set up billing" | disabled |
| 9 | Legacy, add-on, **canceled** | Empty · "Set up billing" | disabled |
| 10 | Legacy, no add-on, **past due** | legacy view · status badge red | disabled |
| 11 | Legacy, add-on, **past due** | legacy view · status badge red | disabled |
| 12 | Legacy, either, **paused** · `not seeded` | legacy view · status badge amber | disabled |

---

## Tier — fixed monthly allowance

| # | state | page shows | API keys |
| --- | --- | --- | --- |
| 13 | Tier, **under limit**, active | neutral bar · Upgrade offered | enabled |
| 14 | Tier, **nearing limit** (≥80%), active | amber bar · "95% of limit" | enabled |
| 15 | Tier, **over limit**, active | red bar · "Over limit" | enabled — **nothing blocks posting** |
| 16 | Tier, **top of ladder**, active | no Upgrade button | enabled |
| 17 | Tier, **cancel scheduled** | "Cancels on <date>" replaces "Renews on" | enabled until it lapses |
| 18 | Tier, **canceled** | Empty · "Set up billing" | disabled |
| 19 | Tier, **past due** | tier view · status badge red | disabled |
| 20 | Tier, **paused** | tier view · status badge amber | disabled |
| 21 | Tier, **trialing** | tier view · status badge green | enabled — **but metering fails** ⚠️ |
| 22 | Tier, **unpaid** (dunning exhausted) · `unreachable` | Empty · "Set up billing" | disabled |

Row 22 is not a gap in the seed — this account's dunning settings **cancel** at
the end of retries rather than moving to `unpaid`, so no sequence of API calls
produces it. Reaching it would mean changing account-wide dunning; the
cancel path (18) is what our customers actually hit.

---

## Mid-change

| # | state | notes |
| --- | --- | --- |
| 23 | Upgrade in flight | modal shows "Confirming…"; nothing changes until Stripe returns |
| 24 | Upgrade charged but card declined | lands in **19 / 10** — a customer trying to pay more loses access ⚠️ |
| 25 | Scheduled upgrade pending next cycle | **not built** |

---

## Odd but reachable

| # | state | notes |
| --- | --- | --- |
| 26 | Live subscription, customer never linked to the team | sweep can't find the team, so keys never toggle; `customer-link` webhook is the backstop |
| 27 | Two live subscriptions on one customer | every read takes the *first* entitling one; nothing prevents it |
| 28 | Legacy carrying Volume Discount as a third item | upgrade deletes every item — **unverified**, and this is where accrued usage was silently dropped once |
| 29 | Quickstart project on a plan without the add-on | nothing gates *becoming* quickstart; keys only correct on the next billing event |

---

## Verifying automatically

```
bun run verify:billing        # every seeded state, exits non-zero on mismatch
bun run verify:billing -- --quiet
```

Asserts each fixture against `billing-states.ts`: which of the three views
renders, the live Stripe status, and whether API access followed. It does NOT
assert usage counts or invoice totals — meter aggregation lags and proration
moves totals legitimately, so those print as context. An assertion calibrated
from observed output would pass by construction and catch nothing.

Known defects are asserted too, as characterization tests: fixing one FAILS the
run, which forces the manifest to be updated in the same change.

> Its first run caught a real bug. The display layer used a denylist
> (`DEAD_STATUSES`) while the access layer used an allowlist
> (`ENTITLING_STATUSES`), and `incomplete` was in neither — so an abandoned
> checkout rendered a live Pro 1K plan with a renewal invoice while its keys
> were correctly disabled. This document already specified "Empty" for row 3;
> the code disagreed. `incomplete` is now a dead status.

## Driving these by hand

`/billing-states` (dev-only) lists every seeded state with its live Stripe
status, its **actual Unkey key tallies**, and the `--only` command that rebuilds
just that one after a destructive test. The key column is the part a visual
check can't do — access is invisible on the billing page, so a churn regression
looks fine until a customer's key 401s.

The seed mints one key per project and then runs the **real**
`syncApiKeyAccessForCustomer` sweep, so those tallies are the production code's
output, not a fixture's assertion about itself.

## The ⚠️ rows, in priority order

1. **24** — upgrading with a failing card disables the customer's keys. No guard.
2. **6 / 7** — a legacy customer who cancels sees no indication anywhere.
3. **21** — trialing entitles access but `increment-team-usage` filters on `status: "active"`, so usage goes unmetered.
4. **15** — over-limit is displayed but never enforced. Deliberate?
5. **28** — unverified path with a known failure mode.
6. **1** — a team that never subscribed keeps working API keys. The sweep is
   webhook-driven, and a team with no Stripe customer produces no webhooks, so
   nothing ever disables them. Surfaced by the key tallies on `/billing-states`;
   whether it's reachable in production depends on whether a key can be minted
   before checkout.

## Coverage

`bun run seed:billing` builds **24 of 29** as real teams against the sandbox,
each verified by running the page's own `getBillingSummary()` against it. Five
are absent, for three different reasons:

| # | why not |
| --- | --- |
| 12 | Legacy paused — `pause_collection` leaves the status `active` (measured), and the trial-based route to a true `paused` needs a licensed price. 20 covers the `paused` rendering. |
| 22 | Unreachable by account configuration — see above. |
| 23, 24, 25 | Transient or unbuilt: 23 exists only during a request, 24 is 19/10 arrived at by a different path, 25 has no implementation yet. |

### How the seed reaches the non-`active` statuses

`incomplete` (3) comes from creating a subscription with
`payment_behavior: "default_incomplete"` and never paying. Everything else
needs a **test clock**, because a status change is a function of time:

- **`past_due` (10, 11, 19)** — subscribe on a good card, swap in
  `pm_card_chargeCustomerFail`, advance past `current_period_end`. For a
  *metered* legacy subscription this only works with usage recorded first: a
  zero-usage renewal invoices **$0**, and Stripe auto-pays a $0 invoice, so
  there is nothing to decline. The seed records 200 posts and polls the meter
  until the summary reflects them before advancing.
- **`paused` (20)** — a trial with
  `trial_settings.end_behavior.missing_payment_method: "pause"` and no payment
  method, advanced past the trial end.

Clock states are grouped so one `advance` serves several teams, and the seed
polls `testClocks.retrieve()` until `status === "ready"` before reading back.
`--only <key>` targets a single clock spec. Reset deletes the clocks, which
cascades to the customers on them.

A clock-advanced subscription has a `current_period_start` in the **future**
relative to real time, which the meter rejects as a backwards window;
`getBillingSummary` skips the usage read in that case (test-clock-only path).
