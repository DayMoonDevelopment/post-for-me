CREATE INDEX IF NOT EXISTS idx_social_posts_project_created_at_id ON public.social_posts(project_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_project_status_created_at_id ON public.social_posts(project_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_project_external_id_created_at_id ON public.social_posts(project_id, external_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_post_configurations_post_id ON public.social_post_configurations(post_id);

CREATE INDEX IF NOT EXISTS idx_social_post_provider_connections_provider_connection_post_id ON public.social_post_provider_connections(provider_connection_id, post_id);
