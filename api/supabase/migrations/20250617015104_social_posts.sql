--
-- Social Provider Enum
CREATE TYPE social_post_status AS enum(
    'draft',
    'scheduled',
    'processing',
    'posted'
);

--
-- Social Posts
CREATE TABLE public.social_posts(
    id text PRIMARY KEY DEFAULT nanoid('sp'),
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    external_id text NULL,
    status social_post_status NOT NULL DEFAULT 'draft',
    caption text NOT NULL,
    post_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

--
-- Social Post Configuration
CREATE TABLE public.social_post_configurations(
    id text PRIMARY KEY DEFAULT nanoid('spc'),
    post_id text NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    caption text NULL,
    provider social_provider NULL,
    provider_connection_id text NULL REFERENCES social_provider_connections(id) ON DELETE SET NULL,
    provider_data jsonb NULL
);

--
-- Function to check if current user has access to a post
CREATE OR REPLACE FUNCTION user_has_post_access(post_id text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER STABLE
    AS $$
    SELECT
        EXISTS(
            SELECT
                1
            FROM
                social_posts sp
                JOIN projects p ON p.id = sp.project_id
                JOIN team_users tm ON p.team_id = tm.team_id
            WHERE
                sp.id = post_id
                AND tm.user_id = auth.uid());
$$;

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.social_post_configurations ENABLE ROW LEVEL SECURITY;

-- Social Posts policies
CREATE POLICY "Users can view their own project's social posts" ON public.social_posts
    FOR SELECT
        USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert into their own project's social posts" ON public.social_posts
    FOR INSERT
        WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update their own project's social posts" ON public.social_posts
    FOR UPDATE
        USING (user_has_project_access(project_id))
        WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete their own project's social posts" ON public.social_posts
    FOR DELETE
        USING (user_has_project_access(project_id));

-- Social Post Configuration policies
CREATE POLICY "Users can view their project's social post configurations" ON public.social_post_configurations
    FOR SELECT
        USING (user_has_post_access(post_id));

CREATE POLICY "Users can insert their project's social post configurations" ON public.social_post_configurations
    FOR INSERT
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can update their project's social post configurations" ON public.social_post_configurations
    FOR UPDATE
        USING (user_has_post_access(post_id));

CREATE POLICY "Users can delete their project's social post configurations" ON public.social_post_configurations
    FOR DELETE
        USING (user_has_post_access(post_id));

