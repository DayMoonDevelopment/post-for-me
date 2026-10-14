import type { TypedSupabaseClient } from "~/lib/.server/supabase";

// Our detail routes are prefix-less (`/social-accounts/:id`, `/social-posts/:id`,
// `/social-post-results/:id`) — they carry the resource id but no project id. To
// call the API we need the project (the temp key is project-scoped), so we map
// resource → project with a single indexed, RLS-scoped lookup.
//
// This is deliberately NOT cached in a cookie: a per-resource cookie would be
// sent on every request to the host and grow unbounded, costing more (header
// bloat) than the lookup it saves. The expensive thing — the API key itself — is
// what we cache (see `temporary-key.ts`). Resolving which project a resource
// belongs to is a cheap admin/routing lookup, legitimately Supabase.
//
// Each returns the owning project id, or null when the resource isn't found /
// isn't accessible (RLS) — the caller turns null into a 404.

/** Normalize a Supabase to-one embed that may come back as an object or a
 * single-element array. */
function embeddedProjectId(
  value: null | { project_id: string } | { project_id: string }[] | undefined,
): null | string {
  if (!value) return null;
  return Array.isArray(value) ? (value[0]?.project_id ?? null) : value.project_id;
}

export async function resolveSocialAccountProject(
  supabase: TypedSupabaseClient,
  accountId: string,
): Promise<null | string> {
  const { data, error } = await supabase
    .from("social_provider_connections")
    .select("project_id")
    .eq("id", accountId)
    .single();
  return error ? null : (data?.project_id ?? null);
}

export async function resolveSocialPostProject(
  supabase: TypedSupabaseClient,
  postId: string,
): Promise<null | string> {
  const { data, error } = await supabase
    .from("social_posts")
    .select("project_id")
    .eq("id", postId)
    .single();
  return error ? null : (data?.project_id ?? null);
}

export async function resolveSocialPostResultProject(
  supabase: TypedSupabaseClient,
  resultId: string,
): Promise<null | string> {
  const { data, error } = await supabase
    .from("social_post_results")
    .select("social_posts(project_id)")
    .eq("id", resultId)
    .single();
  return error ? null : embeddedProjectId(data?.social_posts);
}
