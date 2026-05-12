import { redirect } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

import { sendInviteEmail } from "~/lib/.server/send-invite-email.request";
import { currentUserIsInTeam } from "~/lib/.server/current-user-is-in-team.request";

import type { Database } from "~/lib/.server/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

async function upsertUserByEmail(
  { email, teamId }: { email: string; teamId: string },
  supabase: SupabaseClient<Database>,
  supabaseServiceRole: SupabaseClient<Database>
) {
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
    return supabaseServiceRole.auth.admin.createUser({
      email,
      user_metadata: {
        source: {
          type: "invite",
          team: teamId,
          invited_by: user.data?.user?.id,
        },
      },
    });
  }

  return supabaseServiceRole.auth.admin.getUserById(newUser.data.id);
}

async function addUserToTeam(
  { teamId, email }: { teamId: string; email: string },
  supabase: SupabaseClient<Database>,
  supabaseServiceRole: SupabaseClient
) {
  const newUser = await upsertUserByEmail(
    { email, teamId },
    supabase,
    supabaseServiceRole
  );

  if (!newUser.data?.user) {
    throw new Error("User not found");
  }

  const record = await supabase.from("team_users").upsert({
    team_id: teamId,
    user_id: newUser.data.user.id,
  });

  if (!record.error) {
    try {
      await sendInviteEmail(email);
    } catch (error) {
      console.error("Failed to send invite email:", error);
    }
  }

  return record;
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

    await Promise.all(
      emails.map((email) =>
        addUserToTeam({ teamId, email }, supabase, supabaseServiceRole)
      )
    );

    return redirect(`../?toast=Invited users to the team&toast_type=success`);
  }
);
