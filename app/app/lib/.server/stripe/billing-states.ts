/**
 * The billing state matrix, as data.
 *
 * One manifest, two consumers: `/billing-states` (the hand-testing launcher)
 * and `scripts/billing-verify.ts` (the at-will regression check). They must not
 * drift, which is why the prose and the assertions live in the same record.
 *
 * `expect` is deliberately narrow. It asserts only what we can reason about
 * independently of the code under test — which view renders, what Stripe status
 * the fixture holds, and whether access follows. Values that are legitimately
 * dynamic (usage counts subject to meter lag, invoice totals subject to
 * proration) are REPORTED as drift by the verifier rather than asserted, because
 * an assertion calibrated from observed output would pass by construction.
 *
 * Prose mirrors `BILLING-STATES.md`; that document remains the source of truth.
 */

/** Which of the three page shapes should render. */
export type BillingView = "empty" | "legacy" | "tier";

/** Expected Unkey state for a class of project. `untouched` means no sweep has
 * ever run for this team, so whatever the key was minted as is what it is. */
export type KeyState = "disabled" | "enabled" | "untouched";

export interface StateAssertion {
  /** Non-system (white-label) project keys. */
  keys: KeyState;
  /** Live subscription status; null when nothing but canceled subs exist. */
  status: null | string;
  /** System (quickstart) project keys — omit when the state has no such project. */
  systemKeys?: KeyState;
  view: BillingView;
}

export interface BillingStateSpec {
  /** True where the expected behaviour is a known defect, not a desired one.
   * The verifier still asserts it: a characterization test, so FIXING the
   * defect fails the run and forces this manifest to be updated too. */
  defect?: boolean;
  expect: StateAssertion;
  /** Expected Unkey state, in prose. */
  keys: string;
  /** What the billing page should render, in prose. */
  page: string;
  /** Set when this state is part of the manual UI review pass — the value is
   * what to actually look at. States without it render the same pixels as one
   * that has it, only with different numbers behind them. */
  review?: string;
  /** `bun run seed:billing -- --only <seedKey>` restores this one state. */
  seedKey: null | string;
}

export const BILLING_STATES: Record<number, BillingStateSpec> = {
  1: {
    seedKey: "none-never",
    page: 'Empty state · "Set up billing". No plan, no usage, no receipt.',
    keys: "ENABLED — and nothing will ever disable them. The sweep only runs off Stripe events, and a team that never subscribed generates none.",
    defect: true,
    review: "The empty state itself: does it read as an invitation rather than an error? This is what a brand-new team sees.",
    expect: { view: "empty", status: null, keys: "untouched" },
  },
  2: {
    seedKey: "none-churned",
    page: 'Empty state · "Set up billing".',
    keys: "Disabled.",
    expect: { view: "empty", status: null, keys: "disabled" },
  },
  3: {
    seedKey: "none-incomplete",
    page: "Empty state — an unpaid checkout must NOT read as a live plan.",
    keys: "Disabled.",
    expect: { view: "empty", status: "incomplete", keys: "disabled" },
  },
  4: {
    seedKey: "legacy",
    page: 'Legacy view · tier bands · upgrade card · Quickstart "Not included".',
    keys: "Enabled.",
    review:
      "The legacy pitch: tier bands rendered from the real price, the pop-tinted upgrade card, and the facts strip (Status / Plan [LEGACY] / Quickstart / Billing email).",
    expect: { view: "legacy", status: "active", keys: "enabled" },
  },
  5: {
    seedKey: "legacy-addon",
    page: 'Legacy view · Quickstart "Included via add-on".',
    keys: "Enabled, including quickstart.",
    review:
      'Same page as 04, but Quickstart flips to "Included". Confirm the add-on line item appears on the receipt.',
    expect: {
      view: "legacy",
      status: "active",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  6: {
    seedKey: "legacy-cancelling",
    page: "Legacy view. Cancellation is NOT surfaced anywhere — that's the bug.",
    keys: "Enabled until the period lapses.",
    defect: true,
    review:
      "Look for any sign this subscription is ending. There isn't one — confirm the gap before deciding whether to fix it this round.",
    expect: { view: "legacy", status: "active", keys: "enabled" },
  },
  7: {
    seedKey: "legacy-addon-cancelling",
    page: "Legacy view. Cancellation not surfaced.",
    keys: "Enabled until the period lapses.",
    defect: true,
    expect: {
      view: "legacy",
      status: "active",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  8: {
    seedKey: "legacy-cancelled",
    page: 'Empty state · "Set up billing".',
    keys: "Disabled.",
    expect: { view: "empty", status: null, keys: "disabled" },
  },
  9: {
    seedKey: "legacy-addon-cancelled",
    page: 'Empty state · "Set up billing".',
    keys: "Disabled.",
    expect: {
      view: "empty",
      status: null,
      keys: "disabled",
      systemKeys: "disabled",
    },
  },
  10: {
    seedKey: "legacy-past-due",
    page: "Legacy view · red status badge. Usage panel is blank — the test clock puts the period in the future.",
    keys: "Disabled.",
    review:
      "Failed payment on legacy: the red status badge, and whether a blank usage panel looks broken or merely empty.",
    expect: { view: "legacy", status: "past_due", keys: "disabled" },
  },
  11: {
    seedKey: "legacy-addon-past-due",
    page: "Legacy view · red status badge.",
    keys: "Disabled.",
    expect: { view: "legacy", status: "past_due", keys: "disabled" },
  },
  12: {
    seedKey: null,
    page: "Legacy view · amber status badge.",
    keys: "Disabled.",
    expect: { view: "legacy", status: "paused", keys: "disabled" },
  },
  13: {
    seedKey: "tier-under",
    page: "Tier view · neutral usage bar · Upgrade offered.",
    keys: "Enabled.",
    review:
      "The default paid experience. Receipt styling and its header (Date / Card ···· last4), the usage bar, and the ButtonGroup on the trailing edge.",
    expect: {
      view: "tier",
      status: "active",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  14: {
    seedKey: "tier-nearing",
    page: "Tier view · amber usage bar.",
    keys: "Enabled.",
    review: "The amber threshold — does it read as a nudge rather than an alarm?",
    expect: {
      view: "tier",
      status: "active",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  15: {
    seedKey: "tier-over",
    page: 'Tier view · red bar · "Over limit".',
    keys: "Enabled — over-limit is displayed but never enforced.",
    defect: true,
    review:
      "Over limit: the bar must not overflow its track, and the copy shouldn't threaten a consequence we don't actually enforce.",
    expect: {
      view: "tier",
      status: "active",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  16: {
    seedKey: "tier-top",
    page: "Tier view · NO upgrade button (already top of ladder).",
    keys: "Enabled.",
    review:
      "Top of the ladder: confirm the Upgrade action is gone, not disabled, and the layout doesn't leave a hole where it was.",
    expect: {
      view: "tier",
      status: "active",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  17: {
    seedKey: "tier-cancelling",
    page: '"Cancels on <date>" replaces "Renews on".',
    keys: "Enabled until the period lapses.",
    review:
      'The one fact that swaps label: "Renews on" → "Cancels on". Check the date is client-localized.',
    expect: {
      view: "tier",
      status: "active",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  18: {
    seedKey: "tier-cancelled",
    page: 'Empty state · "Set up billing".',
    keys: "Disabled.",
    expect: { view: "empty", status: null, keys: "disabled" },
  },
  19: {
    seedKey: "tier-past-due",
    page: "Tier view · red status badge.",
    keys: "Disabled.",
    review: "Failed payment on a tier — the paying-customer-locked-out case.",
    expect: { view: "tier", status: "past_due", keys: "disabled" },
  },
  20: {
    seedKey: "tier-paused",
    page: "Tier view · amber status badge.",
    keys: "Disabled.",
    review: "Paused reads differently from past due — confirm it isn't alarming.",
    expect: { view: "tier", status: "paused", keys: "disabled" },
  },
  21: {
    seedKey: "tier-trialing",
    page: "Tier view · green status badge.",
    keys: "Enabled — but usage never meters (`increment-team-usage` filters on `active`).",
    defect: true,
    review:
      "Trial: green badge, and the usage panel reads zero because nothing meters during a trial. Decide whether that's acceptable to ship.",
    expect: {
      view: "tier",
      status: "trialing",
      keys: "enabled",
      systemKeys: "enabled",
    },
  },
  22: {
    seedKey: null,
    page: 'Empty state · "Set up billing".',
    keys: "Disabled.",
    expect: { view: "empty", status: null, keys: "disabled" },
  },
  26: {
    seedKey: "odd-unlinked",
    page: "Team has no customer, so: empty state — even though a live subscription exists in Stripe.",
    keys: "Never toggled; the sweep can't resolve a team. `customer-link` is the backstop.",
    expect: { view: "empty", status: null, keys: "untouched" },
  },
  27: {
    seedKey: "odd-duplicate",
    page: "Renders the FIRST entitling subscription. Nondeterministic by construction.",
    keys: "Enabled.",
    defect: true,
    expect: { view: "tier", status: "active", keys: "enabled" },
  },
  28: {
    seedKey: "odd-volume",
    page: "Legacy view with a third line item. Upgrading deletes every item — the path that silently dropped usage once.",
    keys: "Enabled.",
    defect: true,
    review:
      "Three line items on one legacy subscription: confirm the receipt lists all of them and the totals add up.",
    expect: { view: "legacy", status: "active", keys: "enabled" },
  },
  29: {
    seedKey: "odd-quickstart",
    page: "Legacy view, no add-on, but a quickstart project exists.",
    keys: "Quickstart keys disabled — nothing gates BECOMING quickstart.",
    defect: true,
    expect: {
      view: "legacy",
      status: "active",
      keys: "enabled",
      systemKeys: "disabled",
    },
  },
};
