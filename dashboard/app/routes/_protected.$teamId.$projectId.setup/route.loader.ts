import { data } from "react-router";
import isEmpty from "lodash/isEmpty";

import { withSupabase } from "~/lib/.server/supabase";

import type { Database } from "~/lib/.server/database.types";

function getCredentialStatus(credential: {
  app_id: string | null;
  app_secret: string | null;
  is_system: boolean | null;
}) {
  if (credential.is_system) {
    return "complete";
  }
  if (!isEmpty(credential.app_id) && !isEmpty(credential.app_secret)) {
    return "complete";
  }
  if (credential.app_id || credential.app_secret) {
    return "incomplete";
  }
  return "unstarted";
}

export const loader = withSupabase(
  async ({ supabase, supabaseServiceRole, params }) => {
    const { teamId, projectId } = params;

    if (!teamId) {
      throw new Error("Team code is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const currentUser = await supabase.auth.getUser();

    if (!currentUser.data?.user) {
      throw new Error("User not found");
    }

    const project = await supabase
      .from("projects")
      .select("auth_callback_url, is_system")
      .eq("id", projectId)
      .single();

    if (project.error) {
      return new Response("Project not found", { status: 404 });
    }

    const credentials = project.data.is_system
      ? await supabaseServiceRole
          .from("social_provider_app_credentials")
          .select("provider, project_id, app_id, app_secret")
          .eq("project_id", projectId)
      : await supabase
          .from("social_provider_app_credentials")
          .select("provider, project_id, app_id, app_secret")
          .eq("project_id", projectId);

    const credentialsObject = credentials.data?.reduce(
      (acc, credential) => ({
        ...acc,
        [credential.provider]: {
          appId: project.data.is_system ? "" : credential.app_id,
          appSecret: project.data.is_system ? "" : credential.app_secret,
          status: getCredentialStatus({
            ...credential,
            is_system: project.data.is_system,
          }),
        },
      }),
      {} as Record<
        Database["public"]["Enums"]["social_provider"],
        {
          appId: string | null;
          appSecret: string | null;
          status: "complete" | "incomplete" | "unstarted";
        }
      >
    );

    return data({
      credentials: credentialsObject,
      authCallbackUrl: project.data?.auth_callback_url || "",
      isSystem: project.data?.is_system,
    });
  }
);
