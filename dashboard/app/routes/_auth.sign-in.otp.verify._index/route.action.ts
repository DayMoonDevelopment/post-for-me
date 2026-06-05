import { redirect } from "react-router";
import { syncUserToLoops } from "~/lib/.server/loops";
import { captureServerEvent, deterministicUuid } from "~/tracking/.server/posthog";
import {
  TEAM_ROLE_OWNER,
  roleForTeam,
  trackProjectCreated,
  trackTeamCreated,
  trackTeamMemberJoined,
} from "~/tracking/.server/lifecycle-tracking";
import { withSupabase } from "~/lib/.server/supabase";

// verifyOtp doesn't tell us whether the user was just created, so we treat a
// user whose account was created seconds ago as a fresh signup.
const NEW_USER_WINDOW_MS = 60_000;

export const action = withSupabase(async ({ supabase, supabaseServiceRole, request }) => {
  const formData = await request.formData();
  const token = formData.get("token") as string;
  const email = formData.get("email") as string;

  if (!token) {
    return redirect("/sign-in/otp?error_code=token_required");
  }

  if (!email) {
    return redirect("/sign-in/otp?error_code=email_required");
  }

  try {
    const verify = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (verify.error) {
      let errorCode;

      switch (verify.error?.code) {
        case "otp_expired":
          errorCode = "otp_expired";
          break;
        case "invalid_otp":
          errorCode = "invalid_otp";
          break;
        default:
          errorCode = "invalid_otp";
      }

      return redirect(`/sign-in/otp?error_code=${errorCode}`);
    }

    if (verify.data.user) {
      const user = verify.data.user;

      // Sync user to Loops (fire-and-forget, don't block login)
      syncUserToLoops(user).catch((err) => {
        console.error("Failed to sync user to Loops on OTP login:", err);
      });

      // Track first-time signups (fire-and-forget, don't block login).
      const isNewUser =
        Date.now() - new Date(user.created_at).getTime() < NEW_USER_WINDOW_MS;

      if (isNewUser) {
        void (async () => {
          // Invited users carry `source` metadata pointing at the team they were
          // invited to; organic signups don't. The DB auto-creates a personal
          // team + default project for *every* new user via triggers, but for an
          // invited user that personal team is a throwaway artifact — we attribute
          // their signup to the team they actually joined instead.
          const source = (
            user.user_metadata as
              | { source?: { type?: string; team?: string; invited_by?: string } }
              | undefined
          )?.source;
          const invitedTeamId =
            source?.type === "invite" && typeof source.team === "string"
              ? source.team
              : null;

          if (invitedTeamId) {
            const { data: invitedTeam } = await supabaseServiceRole
              .from("teams")
              .select("id, created_by")
              .eq("id", invitedTeamId)
              .maybeSingle();

            const role = roleForTeam(invitedTeam?.created_by, user.id);
            const invitedBy = source?.invited_by ?? null;

            await captureServerEvent({
              distinctId: user.id,
              event: "user_signed_up",
              teamId: invitedTeamId,
              properties: {
                email: user.email,
                team_id: invitedTeamId,
                role,
                invited_by: invitedBy,
              },
              dedupeKey: deterministicUuid(`user_signed_up:${user.id}`),
            });

            // Seat activation: the invited user authenticated for the first time.
            await trackTeamMemberJoined({
              supabase: supabaseServiceRole,
              teamId: invitedTeamId,
              userId: user.id,
              role,
              invitedBy,
            });
            return;
          }

          // Organic signup: a personal team + default project were auto-created.
          const { data: personalTeam } = await supabaseServiceRole
            .from("teams")
            .select("id, name, created_by, created_at")
            .eq("created_by", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          await captureServerEvent({
            distinctId: user.id,
            event: "user_signed_up",
            teamId: personalTeam?.id ?? undefined,
            properties: {
              email: user.email,
              team_id: personalTeam?.id ?? null,
              role: TEAM_ROLE_OWNER,
            },
            dedupeKey: deterministicUuid(`user_signed_up:${user.id}`),
          });

          if (personalTeam) {
            await trackTeamCreated({
              supabase: supabaseServiceRole,
              team: {
                id: personalTeam.id,
                name: personalTeam.name,
                // We filtered on created_by = user.id, so this is the user.
                created_by: personalTeam.created_by ?? user.id,
                created_at: personalTeam.created_at,
              },
              creationContext: "signup",
            });

            // Treat the auto-created default project as a user-driven creation —
            // it's part of onboarding. (Auto-creation is going away; tracking it
            // as if the user made it keeps the activation signal continuous.)
            const { data: projects } = await supabaseServiceRole
              .from("projects")
              .select("id, name, team_id, created_at")
              .eq("team_id", personalTeam.id)
              .order("created_at", { ascending: true });

            for (const project of projects ?? []) {
              await trackProjectCreated({
                supabase: supabaseServiceRole,
                project,
                actorUserId: user.id,
              });
            }
          }
        })().catch((err) => {
          console.error("Failed to capture signup lifecycle events:", err);
        });
      }

      return redirect("/");
    }

    return redirect("/sign-in/otp?error_code=auth_failed");
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return redirect("/sign-in/otp?error_code=network_error");
  }
});
