import { redirect } from "react-router";
import { syncUserToLoops } from "~/lib/.server/loops";
import { withSupabase } from "~/lib/.server/supabase";

export const action = withSupabase(async ({ supabase, request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email) {
    return redirect("/sign-in/password?error_code=email_required");
  }

  if (!password) {
    return redirect("/sign-in/password?error_code=password_required");
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Handle specific Supabase auth errors
      if (error.message.includes("Invalid login credentials")) {
        return redirect("/sign-in/password?error_code=invalid_credentials");
      }

      return redirect("/sign-in/password?error_code=auth_failed");
    }

    if (data.user) {
      // Sync user to Loops (fire-and-forget, don't block login)
      syncUserToLoops(data.user).catch((err) => {
        console.error("Failed to sync user to Loops on password login:", err);
      });

      // Redirect to dashboard
      return redirect("/");
    }

    return redirect("/sign-in/password?error_code=auth_failed");
  } catch (error) {
    // Handle network errors or other unexpected errors
    if (error instanceof Response) {
      throw error; // Re-throw redirect responses
    }

    return redirect("/sign-in/password?error_code=network_error");
  }
});
