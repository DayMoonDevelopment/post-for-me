import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

export const loader = withSupabase(async ({ params, supabase }) => {
  const { projectId } = params;

  if (!projectId) {
    throw new Response("Not Found", { status: 404 });
  }

  const { data: connections, error } = await supabase
    .from("test_social_provider_connections")
    .select(
      `
      social_provider_connections!inner (
        id,
        provider,
        social_provider_user_name,
        social_provider_profile_photo_url
      )
    `
    )
    .eq("social_provider_connections.project_id", projectId);

  if (error) {
    throw error;
  }

  return data({
    accounts:
      connections.map(
        ({ social_provider_connections: social_provider_connection }) => ({
          id: social_provider_connection.id,
          username: social_provider_connection.social_provider_user_name,
          provider: social_provider_connection.provider,
          profilePhotoUrl:
            social_provider_connection.social_provider_profile_photo_url,
        })
      ) ?? [],
  });
});
