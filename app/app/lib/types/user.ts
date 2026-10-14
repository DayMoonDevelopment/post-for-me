/**
 * A user's profile — the human-facing, editable fields. Distinct from the auth
 * principal (`SessionUser`: id + email derived from the JWT). This is the
 * profile row, fetched through the users service: identity vs. profile.
 *
 * The backing `users` table has no avatar column today, so avatars fall back to
 * initials until there's a source for one.
 */
export interface UserProfile {
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
}

/** Best display name: the full name if present, else the email local-part. */
export function userDisplayName(
  profile: Pick<UserProfile, "firstName" | "lastName" | "email">,
): string {
  const full = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || profile.email.split("@")[0] || profile.email;
}
