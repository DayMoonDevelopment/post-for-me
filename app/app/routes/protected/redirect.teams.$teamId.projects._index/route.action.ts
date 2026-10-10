import { redirect } from "react-router";

import {
  redirectBackWithAppException,
  ValidationException,
} from "~/lib/.server/errors";
import { requireTeamMember, requireUser } from "~/lib/.server/guards";
import { captureUserEvent } from "~/lib/.server/posthog";
import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

import { newProjectSchema } from "./new-project.schema";

/**
 * `POST /redirect/teams/:teamId/projects` — the side-effecting "create a
 * project" hand-off, submitted by `NewProjectModal` (`~/components/new-project`)
 * from the sidebar `+` and the context switcher's "New project" items
 * (`nav-projects.tsx`, `context-switcher.tsx`). Same "modal → fetcher POST →
 * redirect" shape as the connect-account modal: this route always redirects,
 * so `name`/`type` are validated here but any failure (including a bad
 * submission) just 302s back with a flashed toast — the dialog's own
 * `canCreate` gate is what keeps that path rare.
 */
export async function action({ params, context, request }: Route.ActionArgs) {
  let returnTo: string | null = null;
  try {
    const user = await requireUser(context);
    await requireTeamMember(context, params.teamId);

    const form = await request.formData();
    const returnToValue = form.get("return_to");
    returnTo = typeof returnToValue === "string" ? returnToValue : null;

    const parsed = newProjectSchema.safeParse({
      name: form.get("name"),
      type: form.get("type"),
    });
    if (!parsed.success) {
      throw new ValidationException("That project name or type isn't valid.");
    }

    const project = await context.get(servicesContext).projects.create({
      name: parsed.data.name,
      teamId: params.teamId,
      type: parsed.data.type,
    });

    // Best-effort activation signal — never blocks the redirect.
    try {
      captureUserEvent({
        userId: user.id,
        event: "project_created",
        properties: { team_id: params.teamId, project_id: project.id },
      });
    } catch (error) {
      console.error("Failed to capture project_created:", error);
    }

    return redirect(`/projects/${project.id}`);
  } catch (error) {
    return redirectBackWithAppException(request, error, {
      returnTo,
      context: { teamId: params.teamId },
    });
  }
}
