--
-- Social Post Media
CREATE TABLE public.social_post_media(
    id text PRIMARY KEY DEFAULT nanoid('spm'),
    post_id text NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    external_id text NULL,
    url text NOT NULL,
    thumbnail_url text NULL,
    thumbnail_timestamp_ms int NULL,
    provider social_provider NULL,
    provider_connection_id text NULL REFERENCES social_provider_connections(id) ON DELETE SET NULL,
    meta_data jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

--
-- Indexes
CREATE INDEX social_post_media_post_id_idx ON public.social_post_media(post_id);

CREATE INDEX social_post_media_external_id_idx ON public.social_post_media(external_id);

CREATE INDEX social_post_media_url_idx ON public.social_post_media(url);

--
-- RLS
ALTER TABLE public.social_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social post media" ON public.social_post_media
    FOR SELECT
        USING (user_has_post_access(post_id));

CREATE POLICY "Users can create their own social post media" ON public.social_post_media
    FOR INSERT
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can update their own social post media" ON public.social_post_media
    FOR UPDATE
        USING (user_has_post_access(post_id))
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can delete their own social post media" ON public.social_post_media
    FOR DELETE
        USING (user_has_post_access(post_id));

