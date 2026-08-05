import * as React from "react";

import type { ProjectType } from "~/lib/types/project";

/**
 * The live state the setup actions read to decide applicability, completion, and
 * which sub-sections to show (e.g. developer credentials only for white-label).
 * Built once by the launchpad loader from the active project. Flags without a
 * backing service yet are stubbed `false` — the STRUCTURE is what's being built;
 * wiring each flag to real data is a later, local change.
 */
export type SetupContext = {
  accountConnected: boolean;
  apiKeyCreated: boolean;
  billingComplete: boolean;
  /** White-label only: the project's own developer keys are in place. */
  credentialsComplete: boolean;
  firstPostPublished: boolean;
  /** The active project's id — the project-config step targets
   * `/projects/<projectId>/settings`. Null if the user has no project. */
  projectId: string | null;
  /** The active project's credential model — drives applicability + which
   * config sections appear. */
  projectType: ProjectType;
  /** The active team's id — billing is team-scoped, so the billing step's
   * redirect targets `/redirect/teams/<teamId>/checkout`. Null if the user has
   * no team. */
  teamId: string | null;
};

const SetupCtx = React.createContext<SetupContext | null>(null);

/**
 * Provides the active {@link SetupContext} to every setup action rendered
 * beneath it (the launchpad checklist + guided tour). Lives in the neutral
 * `app/components` layer — NOT in `launchpad` — so an action family can read it
 * without depending on the launchpad that consumes it.
 */
export function SetupContextProvider({
  value,
  children,
}: {
  children: React.ReactNode;
  value: SetupContext;
}) {
  return <SetupCtx.Provider value={value}>{children}</SetupCtx.Provider>;
}

/**
 * Read the active setup context. Returns `null` when an action is used OUTSIDE a
 * launchpad (e.g. a contextual standalone dialog on another page), so callers
 * default gracefully rather than throw.
 */
export function useOptionalSetupContext(): SetupContext | null {
  return React.useContext(SetupCtx);
}
