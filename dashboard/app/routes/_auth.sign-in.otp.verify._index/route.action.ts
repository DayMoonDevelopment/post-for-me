import { redirect } from "react-router";
import { syncUserToLoops } from "~/lib/.server/loops";
import { withSupabase } from "~/lib/.server/supabase";

export const action = withSupabase(async ({ supabase, request }) => {
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
      // Sync user to Loops (fire-and-forget, don't block login)
      syncUserToLoops(verify.data.user).catch((err) => {
        console.error("Failed to sync user to Loops on OTP login:", err);
      });

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
