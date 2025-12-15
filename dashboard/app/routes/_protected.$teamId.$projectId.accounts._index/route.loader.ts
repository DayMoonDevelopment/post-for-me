import { data } from "react-router";
import { withSupabase } from "~/lib/.server/supabase";

export const loader = withSupabase(async ({ supabase, params, request }) => {
  const { teamId, projectId } = params;
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const search = url.searchParams.get("search") || "";
  const provider =
    (url.searchParams.get("provider") as
      | "facebook"
      | "instagram"
      | "x"
      | "tiktok"
      | "youtube"
      | "pinterest"
      | "linkedin"
      | "bluesky"
      | "threads") || "";

  const limit = 100;
  const offset = (page - 1) * limit;

  if (!teamId || !projectId) {
    throw new Error("Team ID and Project ID are required");
  }

  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  // Build the query with test user data
  let query = supabase
    .from("social_provider_connections")
    .select(
      `
      *,
      test_social_provider_connections!left (
        social_provider_connection_id,
        name
      )
    `,
      { count: "exact" }
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Add search filter
  if (search) {
    query = query.or(
      `social_provider_user_name.ilike.%${search}%,social_provider_user_id.ilike.%${search}%,external_id.ilike.%${search}%`
    );
  }

  // Add provider filter
  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data: connections, error, count } = await query;

  if (error) {
    console.error("Error fetching social provider connections:", error);
    return data({
      success: false,
      error: error.message,
      connections: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  }

  // Transform data to include isTestUser flag
  const transformedConnections =
    connections?.map((connection) => ({
      ...connection,
      isTestUser: !!connection?.test_social_provider_connections,
      status: connection.access_token ? "connected" : "disconnected",
    })) || [];

  const totalPages = Math.ceil((count || 0) / limit);

  return data({
    success: true,
    connections: transformedConnections,
    totalCount: count || 0,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  });
});
