CREATE INDEX IF NOT EXISTS idx_social_posts_external_id_not_null
ON public.social_posts(external_id)
WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spc_project_provider_created_at_id
ON public.social_provider_connections(project_id, provider, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_spc_project_username_created_at_id
ON public.social_provider_connections(project_id, social_provider_user_name, created_at DESC, id DESC)
WHERE social_provider_user_name IS NOT NULL;
