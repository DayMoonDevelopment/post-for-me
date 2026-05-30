import { redirect } from "react-router";
import { syncUserToLoops } from "~/lib/.server/loops";
import { captureServerEvent, deterministicUuid } from "~/tracking/.server/posthog";
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
          // Signup auto-creates a team (created_by = user.id); attach it so we
          // know which team the user signed up under — they may later join others.
          const { data: signupTeam } = await supabaseServiceRole
            .from("teams")
            .select("id")
            .eq("created_by", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          await captureServerEvent({
            distinctId: user.id,
            event: "user_signed_up",
            teamId: signupTeam?.id ?? undefined,
            properties: { email: user.email },
            dedupeKey: deterministicUuid(`user_signed_up:${user.id}`),
          });
        })().catch((err) => {
          console.error("Failed to capture user_signed_up:", err);
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
