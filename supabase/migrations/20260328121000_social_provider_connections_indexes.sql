CREATE INDEX IF NOT EXISTS idx_social_provider_connections_project_created_at_id ON public.social_provider_connections(project_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_spc_project_connected_created_at_id ON public.social_provider_connections(project_id, created_at DESC, id DESC)
WHERE access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spc_project_disconnected_created_at_id ON public.social_provider_connections(project_id, created_at DESC, id DESC)
WHERE access_token IS NULL;
