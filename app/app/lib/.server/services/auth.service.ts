/**
 * The authenticated principal for a request — id + email derived from the JWT
 * claims. The identity half of the identity/profile split; richer profile data
 * (name, etc.) lives in `UsersService`, not here.
 */
export type SessionUser = {
  email: string;
  id: string;
};

/**
 * The identity / session port. Every "Supabase auth call" lives behind this
 * interface so the entire auth surface can be swapped to the native API in one
 * place. `currentUser` is derived from the request's credentials by the
 * adapter — consumers never know or care whether that's a decoded JWT or a
 * `/me` round-trip. That mechanism is exactly the implementation detail the
 * port exists to hide.
 */
export interface AuthService {
  /** The authenticated principal for this request, or null if signed out. */
  currentUser(): Promise<SessionUser | null>;
  /** Clear the session and redirect to /login. */
  logout(): Promise<Response>;
  /** Request an email OTP (creates the account if new). False if rejected. */
  requestOtp(email: string): Promise<boolean>;
  /**
   * Exchange email + code for a session. On success the session cookies are set
   * (the caller decides navigation — no redirect here). True on success, false
   * on a bad/expired code.
   */
  verifyOtp(input: { code: string; email: string; }): Promise<boolean>;
}
