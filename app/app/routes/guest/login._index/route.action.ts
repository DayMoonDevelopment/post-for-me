import { data } from "react-router";

import { servicesContext } from "~/lib/.server/services";
import { getServerT } from "~/lib/i18n/i18n.server";

import type { Route } from "./+types/route";

import { loginCodeSchema, loginEmailSchema } from "./login.schema";

export type LoginActionData =
  | { error: string; step: "email"; }
  | { email: string; error?: string; step: "verify"; }
  | { email: string; step: "done"; };

export async function action({ request, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  // Auth runs through the service port, not Supabase directly — the same
  // surface the rest of the app uses, swappable in one place on migration.
  const { auth } = context.get(servicesContext);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "request") {
    // Same `loginEmailSchema` the client validated — the server is the source
    // of truth; the client check is only for instant feedback.
    const parsed = loginEmailSchema.safeParse({ email: form.get("email") });
    if (!parsed.success) {
      return data<LoginActionData>(
        { step: "email", error: t("login.errors.invalidEmail") },
        { status: 400 },
      );
    }

    const sent = await auth.requestOtp(parsed.data.email);
    if (!sent) {
      return data<LoginActionData>(
        { step: "email", error: t("login.errors.invalidEmail") },
        { status: 400 },
      );
    }
    return data<LoginActionData>({ step: "verify", email: parsed.data.email });
  }

  if (intent === "verify") {
    const parsed = loginCodeSchema.safeParse({
      email: form.get("email"),
      code: form.get("code"),
    });
    if (!parsed.success) {
      // The email hidden field decides which step re-renders.
      const email = String(form.get("email") ?? "").trim();
      return data<LoginActionData>(
        { step: "verify", email, error: t("login.errors.invalidCode") },
        { status: 400 },
      );
    }

    const verified = await auth.verifyOtp({
      email: parsed.data.email,
      code: parsed.data.code,
    });
    if (!verified) {
      return data<LoginActionData>(
        {
          step: "verify",
          email: parsed.data.email,
          error: t("login.errors.invalidCode"),
        },
        { status: 400 },
      );
    }
    // Success: the session cookies are set on this response. Return a "done"
    // step so the client can hold the verified state briefly, then navigate.
    return data<LoginActionData>({ step: "done", email: parsed.data.email });
  }

  return data<LoginActionData>(
    { step: "email", error: t("login.errors.generic") },
    { status: 400 },
  );
}
