import { redirect } from "react-router";

import { withDashboardKey } from "~/lib/.server/api/api";
import { API_URL } from "~/lib/.server/api/api.constants";
import { currentUserIsInTeam } from "~/lib/.server/current-user-is-in-team.request";
import { withSupabase } from "~/lib/.server/supabase";

export const action = withSupabase(
  withDashboardKey(async ({ request, apiKey, params, supabase }) => {
    const { teamId, projectId } = params;

    if (!teamId || !projectId) {
      throw new Error("Team ID and Project ID are required");
    }

    if (!apiKey) {
      throw new Error("No API Key");
    }

    const [isInTeam, currentUser] = await currentUserIsInTeam(
      { teamId },
      supabase,
    );

    if (!isInTeam || !currentUser) {
      return redirect("/");
    }

    const formData = await request.formData();
    const connectionId = formData.get("connectionId") as string | null;
    const confirmed = formData.get("confirmed") === "true";

    if (!connectionId) {
      const errorParams = new URLSearchParams({
        toast: "Missing connection ID",
        toast_type: "error",
      });

      return redirect(
        `/${teamId}/${projectId}/accounts?${errorParams.toString()}`,
      );
    }

    if (!confirmed) {
      const errorParams = new URLSearchParams({
        toast: "Confirm permanent account deletion before continuing",
        toast_type: "error",
      });

      return redirect(
        `/${teamId}/${projectId}/accounts?${errorParams.toString()}`,
      );
    }

    const apiUrl = `${API_URL}/v1/social-accounts/${connectionId}`;

    try {
      const response = await fetch(apiUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const query = new URLSearchParams({
        toast: response.ok
          ? "Account deleted successfully"
          : "Failed to delete the account",
        toast_type: response.ok ? "success" : "error",
      });

      return redirect(`/${teamId}/${projectId}/accounts?${query.toString()}`);
    } catch (e) {
      console.error("Error deleting account:", e);

      const query = new URLSearchParams({
        toast: "Failed to delete the account",
        toast_type: "error",
      });

      return redirect(`/${teamId}/${projectId}/accounts?${query.toString()}`);
    }
  }),
);
