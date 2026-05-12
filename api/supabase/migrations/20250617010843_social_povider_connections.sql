--
-- Social Provider Connections
CREATE TABLE public.social_provider_connections(
    id text PRIMARY KEY DEFAULT nanoid('spc'),
    provider social_provider NOT NULL,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    external_id text,
    access_token text,
    refresh_token text,
    access_token_expires_at timestamp with time zone NULL,
    refresh_token_expires_at timestamp with time zone NULL,
    social_provider_user_id text NOT NULL,
    social_provider_user_name text,
    social_provider_profile_photo_url text,
    social_provider_metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

--
-- Social Provider Unique Per Project
ALTER TABLE social_provider_connections
    ADD CONSTRAINT social_provider_connections_provider_user_id_unique UNIQUE (provider, project_id, social_provider_user_id);

--
-- Create indexes
CREATE INDEX idx_social_provider_connections_provider_project ON social_provider_connections(provider, project_id);

CREATE INDEX idx_social_provider_connections_external_id ON social_provider_connections(external_id);

CREATE INDEX idx_social_provider_connections_project_id ON social_provider_connections(project_id);

CREATE INDEX idx_social_provider_connections_external_id_project ON social_provider_connections(external_id, project_id);

--
-- Enable Row Level Security
ALTER TABLE social_provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social connections for their team projects" ON social_provider_connections
    FOR SELECT
        USING (user_has_project_access(project_id));

CREATE POLICY "Users can create social connections for their team projects" ON social_provider_connections
    FOR INSERT
        WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update social connections for their team projects" ON social_provider_connections
    FOR UPDATE
        USING (user_has_project_access(project_id))
        WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete social connections for their team projects" ON social_provider_connections
    FOR DELETE
        USING (user_has_project_access(project_id));

