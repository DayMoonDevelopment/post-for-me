import type { SocialAccount } from "./social-account";

/**
 * The display facts for one just-connected account. Deliberately a NARROW pick —
 * it carries NO ids (not our connection id, not the provider's account id) and no
 * tokens. This is what a callback loader serializes to its public fallback page,
 * so it's kept to what's shown: the avatar, the handle/name, the platform, and
 * the health dot. Anything id-shaped stays server-side.
 */
export type ConnectionResultAccount = Pick<
  SocialAccount,
  "platform" | "username" | "avatarUrl" | "status"
>;

/**
 * The data a callback loader returns when it renders the branded fallback (i.e.
 * the project has no `auth_callback_url`). Produced only as the result of a real,
 * `state`-gated OAuth exchange, so it can't be conjured by navigating to the
 * callback URL by hand.
 */
export interface ConnectionResultData {
  accounts: ConnectionResultAccount[];
  /** Show the dashboard CTA only when logged in AND a member of the project. */
  canOpenDashboard: boolean;
  dashboardHref: string | null;
  /** Failure reasons, shown in the failure copy. */
  errorMessages: string[];
  /** Accounts rejected while others succeeded — drives the partial note. */
  failedCount: number;
  isSuccess: boolean;
  /** Normalized provider id (e.g. `instagram`, never `instagram_w_facebook`). */
  provider: string;
}
