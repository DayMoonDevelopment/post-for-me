import { redirect } from "react-router";
import { syncUserToLoops } from "~/lib/.server/loops";
import { withSupabase } from "~/lib/.server/supabase";

export const loader = withSupabase(async function ({ supabase, request }) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const token_hash = url.searchParams.get("token_hash");

  if (!type || !token_hash) {
    throw redirect("/sign-in");
  }

  if (type === "email") {
    const verify = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: token_hash,
    });

    if (verify.error) {
      let errorCode;

      switch (verify.error?.code) {
        case "otp_expired":
          errorCode = "link_expired";
          break;
        default:
          errorCode = "error";
      }

      throw redirect(`/sign-in?error_code=${errorCode}`);
    }

    // Sync user to Loops (fire-and-forget, don't block login)
    if (verify.data?.user) {
      syncUserToLoops(verify.data.user).catch((err) => {
        console.error("Failed to sync user to Loops on magic link login:", err);
      });
    }

    return redirect("/");
  }

  return redirect("/sign-in");
});
