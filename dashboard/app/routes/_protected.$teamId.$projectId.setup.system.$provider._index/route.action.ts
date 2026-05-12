import { data } from "react-router";
import type { Database } from "~/lib/.server/database.types";

import { withSupabase } from "~/lib/.server/supabase";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

export const action = withSupabase(
  async ({ supabase, supabaseServiceRole, params, request }) => {
    const { projectId, provider } = params;

    const formData = await request.formData();

    const action = formData.get("action") as string;

    if (!projectId) {
      return data({ success: false, toast_msg: "Project ID is required" });
    }

    if (!provider) {
      return data({ success: false, toast_msg: "Provider is required" });
    }

    const project = await supabase
      .from("projects")
      .select("is_system")
      .eq("id", projectId)
      .single();

    if (project.error || !project.data) {
      return data({ success: false, toas_msg: "Failed to save credentials" });
    }

    if (!project.data?.is_system) {
      return data({ success: false, toas_msg: "Failed to save credentials" });
    }

    switch (action) {
      case "disable": {
        const { error } = await supabaseServiceRole
          .from("social_provider_app_credentials")
          .delete()
          .eq("project_id", projectId)
          .eq("provider", provider as SocialProviderEnum);

        if (error) {
          console.error(error);
          return data({
            success: false,
            toast_msg: "Failed to disable provider",
          });
        }

        return data({ success: true });
      }
      default: {
        const cred = await supabaseServiceRole
          .from("system_social_provider_app_credentials")
          .select("*")
          .eq("provider", provider as SocialProviderEnum)
          .maybeSingle();

        if (!cred.data) {
          return data({
            success: false,
            toast_msg: "Failed to save credentials",
          });
        }

        const { error } = await supabaseServiceRole
          .from("social_provider_app_credentials")
          .upsert(
            {
              project_id: projectId,
              provider: provider as SocialProviderEnum,
              app_id: cred.data.app_id,
              app_secret: cred.data.app_secret,
            },
            { onConflict: "provider,project_id" }
          );

        if (error) {
          console.error(error);
          return data({
            success: false,
            toast_msg: "Failed to save credentials",
          });
        }

        return data({ success: true });
      }
    }
  }
);
