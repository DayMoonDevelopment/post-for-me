/**
 * Which credential model a project uses — and the second axis of our brand
 * theming. `quickstart` shares Post for Me's platform credentials (instant, no
 * approval); `white-label` uses the team's own credentials (their brand in
 * OAuth). The string doubles as the `data-brand` value (see app.css).
 */
export type ProjectType = "quickstart" | "white-label";

/**
 * A project, owned by a team. App-native DTO — see the note on `Team` for why
 * these shapes are owned by the app rather than derived from the backend.
 *
 * `teamId` is the owning team's `Team["id"]`; loaders compose the flat
 * project/team lists into whatever nested view a component needs.
 */
export interface Project {
  /** Optional OAuth callback URL for the project's own developer app
   * (`projects.auth_callback_url`). White-label projects set this so the
   * connection flow returns to their endpoint; null when unset. */
  callbackUrl: string | null;
  id: string;
  name: string;
  teamId: string;
  type: ProjectType;
}

/** The valid {@link ProjectType} values, for runtime validation of untrusted
 * input (e.g. a form field on the onboarding action). */
export const PROJECT_TYPES = ["quickstart", "white-label"] as const;

export function isProjectType(value: unknown): value is ProjectType {
  return (
    typeof value === "string" &&
    (PROJECT_TYPES as readonly string[]).includes(value)
  );
}

/**
 * The boolean⇄enum seam. The DB stores `is_system` (the shared-credential
 * Quickstart project); the app speaks {@link ProjectType}. These two helpers are
 * the only place the mapping lives — the projects adapter reads through
 * {@link isSystemToProjectType} and writes through {@link projectTypeToIsSystem}.
 */
export function projectTypeToIsSystem(type: ProjectType): boolean {
  return type === "quickstart";
}

export function isSystemToProjectType(isSystem: boolean): ProjectType {
  return isSystem ? "quickstart" : "white-label";
}
