CREATE INDEX IF NOT EXISTS idx_social_post_results_provider_conn_created_at_id ON public.social_post_results(provider_connection_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_post_results_provider_conn_provider_post_id ON public.social_post_results(provider_connection_id, provider_post_id)
WHERE provider_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_social_post_results_provider_conn_post_id ON public.social_post_results(provider_connection_id, post_id);

CREATE INDEX IF NOT EXISTS idx_social_post_result_post_media_result_id ON public.social_post_result_post_media(social_post_result_id);
