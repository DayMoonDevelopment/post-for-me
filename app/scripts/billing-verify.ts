/**
 * At-will regression check for billing.
 *
 *   bun run verify:billing            check every seeded state
 *   bun run verify:billing -- --quiet only print failures
 *
 * Asserts each seeded fixture against `BILLING_STATES`: the view the billing
 * page renders, the live Stripe status, and — the part no visual check can do —
 * whether API access actually followed. Exits non-zero on any mismatch, so it
 * can gate a PR once you want it to.
 *
 * What it deliberately does NOT assert: usage counts and invoice totals. Meter
 * aggregation lags by design and proration moves totals legitimately, so those
 * are printed as context. An assertion calibrated from observed output would
 * pass by construction and catch nothing.
 *
 * Requires a seeded environment (`bun run seed:billing`) and the same env the
 * dashboard uses — Stripe, Supabase service role, and Unkey.
 */
import {
  auditBillingStates,
  keyStateOf,
  type ObservedState,
} from "../app/lib/.server/stripe/billing-state-audit";
import {
  BILLING_STATES,
  type KeyState,
} from "../app/lib/.server/stripe/billing-states";

const quiet = process.argv.includes("--quiet");

const GREEN = "[32m";
const RED = "[31m";
const YELLOW = "[33m";
const DIM = "[2m";
const RESET = "[0m";

interface Failure {
  actual: string;
  expected: string;
  field: string;
}

/** A key that was never swept was minted enabled, and counting can't tell that
 * apart from a key deliberately left on. So `untouched` is satisfied by an
 * enabled key — the distinction is documented, not measured. */
function keysMatch(expected: KeyState, actual: KeyState | null): boolean {
  if (actual === null) return false;
  if (expected === "untouched") return actual === "enabled";
  return expected === actual;
}

function check(state: ObservedState): Failure[] {
  const spec = BILLING_STATES[state.number];
  if (!spec) {
    return [
      { field: "manifest", expected: "a BILLING_STATES entry", actual: "none" },
    ];
  }

  const failures: Failure[] = [];

  if (state.view !== spec.expect.view) {
    failures.push({
      field: "view",
      expected: spec.expect.view,
      actual: state.view,
    });
  }

  if (state.status !== spec.expect.status) {
    failures.push({
      field: "status",
      expected: String(spec.expect.status),
      actual: String(state.status),
    });
  }

  const standard = keyStateOf(state.keys.filter((key) => !key.isSystem));
  if (!keysMatch(spec.expect.keys, standard)) {
    failures.push({
      field: "keys",
      expected: spec.expect.keys,
      actual: standard ?? "none found",
    });
  }

  const systemProjects = state.keys.filter((key) => key.isSystem);
  if (spec.expect.systemKeys) {
    const system = keyStateOf(systemProjects);
    if (!keysMatch(spec.expect.systemKeys, system)) {
      failures.push({
        field: "systemKeys",
        expected: spec.expect.systemKeys,
        actual: system ?? "none found",
      });
    }
  } else if (systemProjects.length > 0) {
    // The fixture grew a system project the manifest doesn't know about —
    // silently ignoring it would hide exactly the add-on regressions we care about.
    failures.push({
      field: "systemKeys",
      expected: "no system project",
      actual: `${systemProjects.length} present`,
    });
  }

  return failures;
}

function context(state: ObservedState): string {
  const { planName, postLimit, usageUsed, invoiceTotal } = state.reported;
  const bits = [
    planName ?? "—",
    postLimit == null ? "no cap" : `${postLimit.toLocaleString()} posts`,
    usageUsed == null ? "usage —" : `${usageUsed.toLocaleString()} used`,
    invoiceTotal == null ? "no invoice" : `next $${invoiceTotal.toFixed(2)}`,
  ];
  return bits.join(" · ");
}

const observed = await auditBillingStates();

if (observed.length === 0) {
  console.error(
    `${RED}No seeded states found.${RESET} Run \`bun run seed:billing\` first.`,
  );
  process.exit(2);
}

let passed = 0;
const failed: { failures: Failure[]; state: ObservedState }[] = [];

console.log(`\nBilling verification · ${observed.length} seeded states\n`);

for (const state of observed.sort((a, b) => a.number - b.number)) {
  const failures = check(state);
  const spec = BILLING_STATES[state.number];

  if (failures.length === 0) {
    passed += 1;
    if (!quiet) {
      const flag = spec?.defect ? ` ${YELLOW}(known defect)${RESET}` : "";
      console.log(`${GREEN}✓${RESET} ${state.name}${flag}`);
      console.log(`  ${DIM}${context(state)}${RESET}`);
    }
    continue;
  }

  failed.push({ state, failures });
  console.log(`${RED}✗${RESET} ${state.name}`);
  for (const failure of failures) {
    console.log(
      `  ${RED}${failure.field}${RESET}: expected ${failure.expected}, got ${failure.actual}`,
    );
  }
  console.log(`  ${DIM}${context(state)}${RESET}`);
}

// A state the manifest says is seedable but that isn't present means the seed
// didn't finish — a silent partial run otherwise reads as a clean pass.
const present = new Set(observed.map((state) => state.number));
const missing = Object.entries(BILLING_STATES)
  .filter(([number, spec]) => spec.seedKey && !present.has(Number(number)))
  .map(([number]) => number);

console.log(
  `\n${passed}/${observed.length} passed` +
    (failed.length > 0 ? ` · ${RED}${failed.length} failed${RESET}` : ""),
);

if (missing.length > 0) {
  console.log(
    `${YELLOW}⚠️  not seeded: ${missing.join(", ")}${RESET} — re-run \`bun run seed:billing\``,
  );
}

if (failed.length > 0) {
  console.log(
    `\nRestore a single state with ${DIM}bun run seed:billing -- --only <key>${RESET}:`,
  );
  for (const { state } of failed) {
    const key = BILLING_STATES[state.number]?.seedKey;
    if (key) console.log(`  ${state.number} → --only ${key}`);
  }
}

process.exit(failed.length > 0 || missing.length > 0 ? 1 : 0);
