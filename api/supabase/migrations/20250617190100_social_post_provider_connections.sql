--
-- Social Post Provider Connections
CREATE TABLE social_post_provider_connections(
    id text DEFAULT nanoid('sppc') PRIMARY KEY,
    post_id text REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
    provider_connection_id text REFERENCES social_provider_connections(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (post_id, provider_connection_id)
);

--
-- Add RLS policies
ALTER TABLE social_post_provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social post connections" ON public.social_post_provider_connections
    FOR SELECT
        USING (user_has_post_access(post_id));

CREATE POLICY "Users can insert their own social post connections" ON public.social_post_provider_connections
    FOR INSERT
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can update their own social post connections" ON public.social_post_provider_connections
    FOR UPDATE
        USING (user_has_post_access(post_id))
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can delete their own social post connections" ON public.social_post_provider_connections
    FOR DELETE
        USING (user_has_post_access(post_id));

--
-- Create indexes
CREATE INDEX social_post_provider_connections_social_post_id_idx ON social_post_provider_connections(post_id);

CREATE INDEX social_post_provider_connections_social_provider_connection_id_idx ON social_post_provider_connections(provider_connection_id);

