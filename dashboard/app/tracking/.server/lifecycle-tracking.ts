import {
  captureServerEvent,
  deterministicUuid,
  setProjectGroupProperties,
  setTeamGroupProperties,
} from "./posthog";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/.server/database.types";

/**
 * User-lifecycle (non-billing) PostHog events: team / project / membership
 * moments that originate from in-app user actions rather than the Stripe
 * webhook. Paid-lifecycle events still live in
 * `routes/api.stripe.webhook/.server/subscription-lifecycle-tracking.ts` and
 * must be sourced from Stripe — keep that split intact.
 *
 * Every export here is best-effort and may throw (the count/lookup queries can
 * fail); call sites wrap them in `try/catch` (fire-and-forget) so a tracking
 * failure can never take down the surrounding route action.
 */

// We have no `role` column on `team_users` — the team's `created_by` is the
// owner and everyone else is a member. Derive it rather than inventing schema.
// If a real roles system lands later, replace `roleForTeam` with a column read.
export const TEAM_ROLE_OWNER = "owner";
export const TEAM_ROLE_MEMBER = "member";
export type TeamRole = typeof TEAM_ROLE_OWNER | typeof TEAM_ROLE_MEMBER;

export function roleForTeam(
  teamCreatedBy: string | null | undefined,
  userId: string,
): TeamRole {
  return teamCreatedBy === userId ? TEAM_ROLE_OWNER : TEAM_ROLE_MEMBER;
}

type ServiceClient = SupabaseClient<Database>;

/**
 * Count a team's current shape: how many members and projects it has. Used to
 * keep `member_count` / `project_count` on the `team` group fresh so churned
 * teams can be segmented by size.
 */
async function countTeamShape(
  supabase: ServiceClient,
  teamId: string,
): Promise<{ memberCount: number; projectCount: number }> {
  const [members, projects] = await Promise.all([
    supabase
      .from("team_users")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", teamId),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
  ]);

  return {
    memberCount: members.count ?? 0,
    projectCount: projects.count ?? 0,
  };
}

/**
 * Refresh `member_count` / `project_count` (and optionally `name`) on the team
 * group. `groupIdentify` merges, so this never clobbers the billing-state props
 * the subscription tracker sets.
 */
export async function refreshTeamShape(
  supabase: ServiceClient,
  teamId: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const { memberCount, projectCount } = await countTeamShape(supabase, teamId);
  await setTeamGroupProperties(teamId, {
    member_count: memberCount,
    project_count: projectCount,
    ...extra,
  });
}

/**
 * Fire `team_created` when a team (billing unit) comes into existence — from an
 * organic signup's auto-created team or an explicit "create team" action. The
 * team starts with no subscription, so `plan_name` is null. Also seeds the
 * group's shape (name + member/project counts).
 */
export async function trackTeamCreated({
  supabase,
  team,
  creationContext,
  timestamp,
}: {
  supabase: ServiceClient;
  team: {
    id: string;
    name: string | null;
    created_by: string;
    created_at?: string | null;
  };
  /** How the team was created: `signup` (auto) or `manual` (explicit). */
  creationContext: "signup" | "manual";
  timestamp?: Date;
}): Promise<void> {
  // Seed the group's real creation date so it can be filtered by when the team
  // actually existed, not when PostHog first registered the group.
  await refreshTeamShape(supabase, team.id, {
    name: team.name,
    ...(team.created_at ? { created_at: team.created_at } : {}),
  });

  await captureServerEvent({
    distinctId: team.created_by,
    event: "team_created",
    teamId: team.id,
    properties: {
      team_id: team.id,
      created_by_user_id: team.created_by,
      creation_context: creationContext,
      plan_name: null,
    },
    dedupeKey: deterministicUuid(`team_created:${team.id}`),
    timestamp,
  });
}

/**
 * Fire `project_created`. Projects are where events originate, so creation is a
 * strong activation signal. Attributed to the acting user and rolled up to both
 * the team and the project groups.
 */
export async function trackProjectCreated({
  supabase,
  project,
  actorUserId,
  timestamp,
}: {
  supabase: ServiceClient;
  project: {
    id: string;
    name: string | null;
    team_id: string;
    created_at?: string | null;
  };
  actorUserId: string;
  timestamp?: Date;
}): Promise<void> {
  await setProjectGroupProperties(project.id, {
    name: project.name,
    team_id: project.team_id,
    ...(project.created_at ? { created_at: project.created_at } : {}),
  });

  await captureServerEvent({
    distinctId: actorUserId,
    event: "project_created",
    teamId: project.team_id,
    projectId: project.id,
    properties: {
      project_id: project.id,
      project_name: project.name,
      team_id: project.team_id,
    },
    dedupeKey: deterministicUuid(`project_created:${project.id}`),
    timestamp,
  });

  // Project count on the team changed.
  await refreshTeamShape(supabase, project.team_id);
}

/**
 * Fire `project_deleted`. May signal disengagement. Refreshes the team's
 * `project_count` afterward.
 */
export async function trackProjectDeleted({
  supabase,
  project,
  actorUserId,
  timestamp,
}: {
  supabase: ServiceClient;
  project: { id: string; team_id: string };
  actorUserId: string;
  timestamp?: Date;
}): Promise<void> {
  await captureServerEvent({
    distinctId: actorUserId,
    event: "project_deleted",
    teamId: project.team_id,
    projectId: project.id,
    properties: {
      project_id: project.id,
      team_id: project.team_id,
    },
    dedupeKey: deterministicUuid(`project_deleted:${project.id}`),
    timestamp,
  });

  await refreshTeamShape(supabase, project.team_id);
}

/**
 * Fire `team_member_invited` when an invite is sent. Keyed to the invitee so it
 * pairs with `team_member_joined` for an invite→join funnel. `is_new_user`
 * distinguishes a brand-new invitee (joins on first auth) from an existing user
 * (joins immediately — see the members.add action).
 */
export async function trackTeamMemberInvited({
  teamId,
  inviteeUserId,
  inviteeEmail,
  inviterUserId,
  isNewUser,
}: {
  teamId: string;
  inviteeUserId: string;
  inviteeEmail: string;
  inviterUserId: string;
  isNewUser: boolean;
}): Promise<void> {
  await captureServerEvent({
    distinctId: inviteeUserId,
    event: "team_member_invited",
    teamId,
    properties: {
      team_id: teamId,
      role: TEAM_ROLE_MEMBER,
      inviter_user_id: inviterUserId,
      invitee_email: inviteeEmail,
      is_new_user: isNewUser,
    },
    dedupeKey: deterministicUuid(`team_member_invited:${teamId}:${inviteeUserId}`),
  });
}

/**
 * Fire `team_member_joined` when a seat becomes active: an already-existing user
 * is added (immediate) or an invited new user authenticates for the first time.
 * Refreshes the team's `member_count`.
 */
export async function trackTeamMemberJoined({
  supabase,
  teamId,
  userId,
  role,
  invitedBy,
  timestamp,
}: {
  supabase: ServiceClient;
  teamId: string;
  userId: string;
  role: TeamRole;
  invitedBy?: string | null;
  timestamp?: Date;
}): Promise<void> {
  await captureServerEvent({
    distinctId: userId,
    event: "team_member_joined",
    teamId,
    properties: {
      team_id: teamId,
      role,
      invited_by: invitedBy ?? null,
    },
    dedupeKey: deterministicUuid(`team_member_joined:${teamId}:${userId}`),
    timestamp,
  });

  await refreshTeamShape(supabase, teamId);
}

/**
 * Fire `team_member_removed`. Seat loss often precedes churn. Keyed to the
 * removed user; refreshes the team's `member_count`.
 *
 * NOTE: dedupe is `team:user`, so a remove → re-invite → remove of the same
 * user collapses to one event. There's no historical record of removals (the
 * `team_users` row is gone), so this event is live-only — no backfill.
 */
export async function trackTeamMemberRemoved({
  supabase,
  teamId,
  removedUserId,
  removedByUserId,
  role,
  isSelfRemoval,
}: {
  supabase: ServiceClient;
  teamId: string;
  removedUserId: string;
  removedByUserId: string;
  role: TeamRole;
  isSelfRemoval: boolean;
}): Promise<void> {
  await captureServerEvent({
    distinctId: removedUserId,
    event: "team_member_removed",
    teamId,
    properties: {
      team_id: teamId,
      role,
      removed_by_user_id: removedByUserId,
      is_self_removal: isSelfRemoval,
    },
    dedupeKey: deterministicUuid(`team_member_removed:${teamId}:${removedUserId}`),
  });

  await refreshTeamShape(supabase, teamId);
}
