--
-- Social Post Results
CREATE TABLE public.social_post_results(
    id text PRIMARY KEY DEFAULT nanoid('spr'),
    post_id text NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    provider_connection_id text NULL REFERENCES social_provider_connections(id) ON DELETE SET NULL,
    details jsonb NULL,
    provider_post_id text NULL,
    provider_post_url text NULL,
    success boolean NOT NULL,
    error_message text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

--
-- Indexes
CREATE INDEX social_post_results_provider_connection_id_idx ON public.social_post_results(provider_connection_id);

CREATE INDEX social_post_results_post_id_idx ON public.social_post_results(post_id);

--
-- RLS
ALTER TABLE public.social_post_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social post results" ON public.social_post_results
    FOR SELECT
        USING (user_has_post_access(post_id));

CREATE POLICY "Users can insert their own social post results" ON public.social_post_results
    FOR INSERT
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can update their own social post results" ON public.social_post_results
    FOR UPDATE
        USING (user_has_post_access(post_id))
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can delete their own social post results" ON public.social_post_results
    FOR DELETE
        USING (user_has_post_access(post_id));

