import { data } from "react-router";

import { isValidTheme } from "~/lib/theme/config";
import { themeCookie } from "~/lib/theme/theme.server";

import type { Route } from "./+types/route";

/**
 * `POST /api/theme` — persist the creator's explicit Light/Dark/System choice.
 * Public (no session needed): it's a UI preference, not account data, and the
 * toggle is reachable before a full page reload settles auth state.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const submitted = form.get("theme");
  const theme = typeof submitted === "string" ? submitted : null;

  if (!isValidTheme(theme)) {
    return data({ ok: false }, { status: 400 });
  }

  return data(
    { ok: true },
    { headers: { "Set-Cookie": await themeCookie.serialize(theme) } },
  );
}
