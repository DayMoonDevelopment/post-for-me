import * as React from "react";

import type { ConnectionResultData } from "~/lib/types/connection-result";

import { ConnectionResult } from "~/components/connection-result";
import { Button } from "~/ui/button";

import { Section } from "./section";

/** The OAuth callback fallback states — the review surface for a page you can't
 * easily reach without completing a real provider flow. */
const FIXTURES: Record<string, ConnectionResultData> = {
  success: {
    isSuccess: true,
    provider: "instagram",
    accounts: [
      {
        platform: "instagram",
        username: "acme.studio",
        avatarUrl: null,
        status: "connected",
      },
    ],
    errorMessages: [],
    failedCount: 0,
    canOpenDashboard: true,
    dashboardHref: "/projects/demo/social-accounts",
  },
  multi: {
    isSuccess: true,
    provider: "facebook",
    accounts: [
      { platform: "facebook", username: "Acme Coffee", avatarUrl: null, status: "connected" },
      { platform: "facebook", username: "Acme Roasters", avatarUrl: null, status: "connected" },
      { platform: "facebook", username: "Acme Wholesale", avatarUrl: null, status: "connected" },
    ],
    errorMessages: [],
    failedCount: 0,
    canOpenDashboard: false,
    dashboardHref: null,
  },
  partial: {
    isSuccess: true,
    provider: "linkedin",
    accounts: [
      { platform: "linkedin", username: "Jane Doe", avatarUrl: null, status: "connected" },
    ],
    errorMessages: ["External Id already exists for account conn_987"],
    failedCount: 1,
    canOpenDashboard: true,
    dashboardHref: "/projects/demo/social-accounts",
  },
  failure: {
    isSuccess: false,
    provider: "x",
    accounts: [],
    errorMessages: ["No valid accounts found"],
    failedCount: 0,
    canOpenDashboard: false,
    dashboardHref: null,
  },
};

const STATES = Object.keys(FIXTURES);

export function ConnectionResultDemo() {
  const [state, setState] = React.useState<string>("success");

  return (
    <div className="space-y-6">
      <Section title="State">
        {STATES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={state === s ? "default" : "outline"}
            onClick={() => setState(s)}
          >
            {s}
          </Button>
        ))}
      </Section>

      <div className="relative h-[560px] overflow-auto rounded-md border border-border">
        <ConnectionResult data={FIXTURES[state]!} />
      </div>
    </div>
  );
}
