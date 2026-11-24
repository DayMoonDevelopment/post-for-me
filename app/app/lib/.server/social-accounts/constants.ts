/** The Supabase Storage bucket that mirrors provider profile photos so the
 * dashboard never hotlinks a (often short-lived, CORS-locked) provider CDN URL. */
export const SOCIAL_ACCOUNT_PHOTO_BUCKET_NAME = "social-account-photos";

/**
 * The dashboard's own origin, used to rebuild the exact `redirect_uri` the OAuth
 * flow was started with — the provider token-exchange requires a byte-identical
 * value. Mirrors the API's `DASHBOARD_APP_URL` (see the API `auth-url.helper`).
 *
 * A function, not a const, so a missing `APP_URL` fails HERE rather than at
 * module load — the OAuth callback breaks, not the whole dashboard.
 *
 * Outside development it throws instead of falling back. Silently using the Vite
 * dev origin in production sends `redirect_uri=http://localhost:5173/...` to the
 * provider, which rejects it as a mismatch — so the symptom surfaces at the
 * provider, in someone else's error message, with nothing pointing at the real
 * cause. Better to name it.
 */
export function redirectAppUrl(): string {
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_URL is not set — it is the base of the OAuth `redirect_uri` and must " +
        "match what the provider was given when the flow started.",
    );
  }

  return "http://localhost:5173";
}
