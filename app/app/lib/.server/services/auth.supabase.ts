import { redirect } from "react-router";

import type { TypedSupabaseClient } from "~/lib/.server/supabase";

import { captureUserEvent } from "~/lib/.server/posthog";

import type { AuthService } from "./auth.service";

/**
 * Supabase-backed {@link AuthService}, bound to this request's client. This is
 * the ONLY place Supabase auth is touched — to migrate off it, replace this
 * file with `createApiAuthService` and every consumer (login action, logout
 * route, the _protected/_guest gates) stays untouched.
 */
export function createSupabaseAuthService(
  supabase: TypedSupabaseClient,
): AuthService {
  return {
    /**
     * Who is logged in. `getClaims` validates the JWT signature (locally with
     * asymmetric signing keys, otherwise against the Auth server); a missing or
     * invalid token reads as signed out. It also refreshes an expired session
     * when possible — the new cookies ride out on the response via the root
     * middleware.
     */
    async currentUser() {
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims) return null;
      const { sub, email } = data.claims;
      if (!sub || !email) return null;
      return { id: sub, email };
    },

    /**
     * Email + OTP is the only flow: requesting a code for an unknown email
     * creates the account (`shouldCreateUser`), so sign-in and sign-up are one
     * action. Returns false on a rejected email.
     */
    async requestOtp(email) {
      if (!email.includes("@")) return false;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return !error;
    },

    /**
     * Exchange email + code for a session. On success the server client writes
     * the session cookies (flushed onto the response by the root middleware);
     * navigation is the caller's call. False on a bad/expired code so the form
     * can re-render.
     */
    async verifyOtp({ email, code }) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error || !data.user) return false;
      captureUserEvent({ userId: data.user.id, event: "user_logged_in" });
      return true;
    },

    /** Clear the session cookies and land on /login. */
    async logout() {
      await supabase.auth.signOut();
      return redirect("/login");
    },
  };
}
