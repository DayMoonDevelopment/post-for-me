import { data, redirect } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import type { Database } from "~/lib/.server/database.types";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

export const loader = withSupabase(
  async ({ supabase, supabaseServiceRole, params }) => {
    const { teamId, projectId, provider } = params;

    if (!teamId) {
      throw new Error("Team code is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!provider) {
      throw new Error("Provider is required");
    }

    const currentUser = await supabase.auth.getUser();

    if (!currentUser.data?.user) {
      throw new Error("User not found");
    }

    const [project, credential] = await Promise.all([
      supabase
        .from("projects")
        .select("auth_callback_url, is_system")
        .eq("id", projectId)
        .single(),
      supabaseServiceRole
        .from("social_provider_app_credentials")
        .select("provider, project_id, app_id, app_secret")
        .eq("project_id", projectId)
        .eq("provider", provider as SocialProviderEnum)
        .maybeSingle(),
    ]);

    if (project.error) {
      throw new Response("Project not found", { status: 404 });
    }

    if (!project.data.is_system) {
      return redirect(`/${teamId}/${projectId}/setup`);
    }

    return data({
      provider,
      isEnabled: credential.data !== null,
    });
  }
);
