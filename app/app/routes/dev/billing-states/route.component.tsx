import { Link, useLoaderData } from "react-router";

import type {
  ObservedState,
  ProjectKeys,
} from "~/lib/.server/stripe/billing-state-audit";

import { BILLING_STATES } from "~/lib/.server/stripe/billing-states";
import { Badge } from "~/ui/badge";
import { Copyable } from "~/ui/copyable";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/ui/empty";

import type { loader } from "./route.loader";

/** The groups from BILLING-STATES.md, so the page reads in the same order as
 * the document it tests against. */
const GROUPS: { range: [number, number]; title: string }[] = [
  { title: "No subscription", range: [1, 3] },
  { title: "Legacy — metered, pay per post", range: [4, 12] },
  { title: "Tier — fixed monthly allowance", range: [13, 22] },
  { title: "Odd but reachable", range: [26, 29] },
];

function statusVariant(status: null | string) {
  if (status === "active" || status === "trialing") return "success-light";
  if (status === "past_due" || status === "unpaid") return "destructive-light";
  if (status === "paused" || status === "incomplete") return "warning-light";
  return "secondary";
}

/** One line per project: what Unkey actually holds right now. */
function KeyTally({ keys }: { keys: ProjectKeys[] }) {
  if (keys.length === 0) {
    return <span className="text-muted-foreground">no projects</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {keys.map((project) => (
        <span key={project.projectId} className="flex items-center gap-1.5">
          {project.isSystem ? (
            <Badge variant="outline" size="sm">
              system
            </Badge>
          ) : null}
          {project.unreadable ? (
            <span className="text-muted-foreground">unreadable</span>
          ) : (
            <span className="tabular-nums">
              <span className="text-foreground">{project.enabled} on</span>
              <span className="text-muted-foreground"> · </span>
              <span className="text-foreground">{project.disabled} off</span>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function StateRow({ state }: { state: ObservedState }) {
  const expectation = BILLING_STATES[state.number];

  return (
    <div className="flex flex-col gap-3 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/teams/${state.teamId}/billing`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {state.name}
        </Link>
        <div className="flex items-center gap-2">
          {expectation?.review ? (
            <Badge variant="info-light" size="sm">
              review
            </Badge>
          ) : null}
          {expectation?.defect ? (
            <Badge variant="warning-light" size="sm">
              known defect
            </Badge>
          ) : null}
          <Badge variant={statusVariant(state.status)} size="sm">
            {state.status ?? "no live subscription"}
          </Badge>
        </div>
      </div>

      {expectation ? (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
          {expectation.review ? (
            <>
              <dt className="text-muted-foreground">Look at</dt>
              <dd className="text-foreground">{expectation.review}</dd>
            </>
          ) : null}

          <dt className="text-muted-foreground">Page should show</dt>
          <dd className="text-foreground">{expectation.page}</dd>

          <dt className="text-muted-foreground">Keys should be</dt>
          <dd className="text-foreground">{expectation.keys}</dd>

          <dt className="text-muted-foreground">Keys are</dt>
          <dd>
            <KeyTally keys={state.keys} />
          </dd>

          {expectation.seedKey ? (
            <>
              <dt className="text-muted-foreground">Restore</dt>
              <dd>
                <Copyable
                  value={`bun run seed:billing -- --only ${expectation.seedKey}`}
                  className="font-mono text-xs"
                >
                  {`--only ${expectation.seedKey}`}
                </Copyable>
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

/**
 * `/dev/billing-states` — drive the billing state matrix by hand.
 *
 * The point is to make a destructive test cheap: every state is one click away,
 * its expected behaviour is stated next to it, and the command that rebuilds
 * that ONE state after you've consumed it is right there to copy. Without that
 * last part, hand-testing an upgrade means re-seeding all 24.
 *
 * "Keys should be" vs "Keys are" is the part a visual check can't do — API
 * access is invisible on the billing page, so a churn regression looks fine
 * until a customer's key 401s.
 */
export function Component() {
  // `useLoaderData` rather than `Route.ComponentProps`: routes in the dev group
  // are registered outside the typed-route pipeline (see `app/routes.ts`), so
  // React Router renders them with NO props — the props object arrives empty.
  const { states } = useLoaderData<typeof loader>();
  const reviewStates = states.filter(
    (state) => BILLING_STATES[state.number]?.review,
  );

  if (states.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl p-8">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No seeded states</EmptyTitle>
            <EmptyDescription>
              Run <code>bun run seed:billing</code> to build the fixture teams.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Billing states
        </h1>
        <p className="text-sm text-muted-foreground">
          {states.length} seeded fixtures against the Stripe sandbox. Status and
          key tallies are read live, so a row that disagrees with its expectation
          is either a regression or a fixture you&apos;ve already spent — restore
          it and try again. Full matrix and the five unseeded states:{" "}
          <code className="text-foreground">BILLING-STATES.md</code>.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-foreground">
          This round&apos;s review pass — {reviewStates.length} states
        </h2>
        <p className="text-sm text-muted-foreground">
          The 24 fixtures collapse into these distinct renderings; the rest are
          the same pixels with different numbers behind them. Walk these, then
          let <code className="text-foreground">bun run verify:billing</code>
          {" "}hold the line on the invariants.
        </p>
        <ol className="flex flex-col gap-1 text-sm">
          {reviewStates.map((state) => (
            <li key={state.teamId}>
              <Link
                to={`/teams/${state.teamId}/billing`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {state.name}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {GROUPS.map((group) => {
        const rows = states.filter(
          (state) =>
            state.number >= group.range[0] && state.number <= group.range[1],
        );
        if (rows.length === 0) return null;

        return (
          <section key={group.title} className="flex flex-col gap-1">
            <h2 className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              {group.title}
            </h2>
            <div className="flex flex-col divide-y divide-border">
              {rows.map((state) => (
                <StateRow key={state.teamId} state={state} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
