import { redirect } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

import { sendInviteEmail } from "~/lib/.server/send-invite-email.request";
import { currentUserIsInTeam } from "~/lib/.server/current-user-is-in-team.request";
import {
  TEAM_ROLE_MEMBER,
  trackTeamMemberInvited,
  trackTeamMemberJoined,
} from "~/tracking/.server/lifecycle-tracking";

import type { Database } from "~/lib/.server/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Result of adding one invitee, used to drive the membership tracking events. */
type AddedMember = {
  userId: string;
  email: string;
  /** True when the invitee's auth account was just created by this invite. */
  isNewUser: boolean;
};

async function upsertUserByEmail(
  { email, teamId }: { email: string; teamId: string },
  supabase: SupabaseClient<Database>,
  supabaseServiceRole: SupabaseClient<Database>
): Promise<{ userId: string | null; isNewUser: boolean }> {
  const [user, newUser] = await Promise.all([
    supabase.auth.getUser(),
    supabaseServiceRole
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle(),
  ]);

  if (!user.data) {
    throw new Error("Unauthorized");
  }

  if (!newUser.data) {
    const created = await supabaseServiceRole.auth.admin.createUser({
      email,
      user_metadata: {
        source: {
          type: "invite",
          team: teamId,
          invited_by: user.data?.user?.id,
        },
      },
    });
    return { userId: created.data?.user?.id ?? null, isNewUser: true };
  }

  const fetched = await supabaseServiceRole.auth.admin.getUserById(
    newUser.data.id
  );
  return { userId: fetched.data?.user?.id ?? null, isNewUser: false };
}

async function addUserToTeam(
  { teamId, email }: { teamId: string; email: string },
  supabase: SupabaseClient<Database>,
  supabaseServiceRole: SupabaseClient<Database>
): Promise<AddedMember | null> {
  const { userId, isNewUser } = await upsertUserByEmail(
    { email, teamId },
    supabase,
    supabaseServiceRole
  );

  if (!userId) {
    throw new Error("User not found");
  }

  const record = await supabase.from("team_users").upsert({
    team_id: teamId,
    user_id: userId,
  });

  // Preserve the existing behavior: a failed upsert doesn't throw — we just
  // skip the email and (now) the tracking for that invitee.
  if (record.error) {
    console.error("Failed to add user to team:", record.error);
    return null;
  }

  try {
    await sendInviteEmail(email);
  } catch (error) {
    console.error("Failed to send invite email:", error);
  }

  return { userId, email, isNewUser };
}

export const action = withSupabase(
  async ({ supabase, supabaseServiceRole, params, request }) => {
    const { teamId } = params;
    const formData = await request.formData();
    const emails = formData.getAll("emails") as string[];

    if (!teamId) {
      throw new Error("Team code is required");
    }

    const [isInTeam, currentUser] = await currentUserIsInTeam(
      { teamId },
      supabase
    );

    if (!isInTeam || !currentUser) {
      return redirect("/");
    }

    const added = await Promise.all(
      emails.map((email) =>
        addUserToTeam({ teamId, email }, supabase, supabaseServiceRole)
      )
    );

    // Track each invite. Brand-new invitees fire `team_member_joined` when they
    // first authenticate (handled in the OTP-verify action); already-existing
    // users are active immediately, so we fire it here. Fire-and-forget.
    void (async () => {
      for (const member of added) {
        if (!member) continue;

        await trackTeamMemberInvited({
          teamId,
          inviteeUserId: member.userId,
          inviteeEmail: member.email,
          inviterUserId: currentUser.id,
          isNewUser: member.isNewUser,
        });

        if (!member.isNewUser) {
          await trackTeamMemberJoined({
            supabase: supabaseServiceRole,
            teamId,
            userId: member.userId,
            role: TEAM_ROLE_MEMBER,
            invitedBy: currentUser.id,
          });
        }
      }
    })().catch((err) => {
      console.error("Failed to capture team membership events:", err);
    });

    return redirect(`../?toast=Invited users to the team&toast_type=success`);
  }
);
