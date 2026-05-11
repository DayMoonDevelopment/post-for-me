-- Create oauth_data table
CREATE TABLE public.social_provider_connection_oauth_data(
    id text DEFAULT nanoid('oad') PRIMARY KEY,
    project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    provider social_provider NOT NULL,
    key_id text NOT NULL,
    key TEXT NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Create unique constraint on project_id, key, and value combination
ALTER TABLE public.social_provider_connection_oauth_data
    ADD CONSTRAINT unique_project_key_value UNIQUE (project_id, provider, key_id, value);

-- Create indexes for performance
CREATE INDEX idx_oauth_data_key_id ON public.social_provider_connection_oauth_data(key_id);

CREATE INDEX idx_oauth_data_key ON public.social_provider_connection_oauth_data(key);

CREATE INDEX idx_oauth_data_value ON public.social_provider_connection_oauth_data(value);

CREATE INDEX idx_oauth_data_project_id ON public.social_provider_connection_oauth_data(project_id);

CREATE INDEX idx_oauth_data_key_value ON public.social_provider_connection_oauth_data(key_id, value);

-- Enable RLS
ALTER TABLE public.social_provider_connection_oauth_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for SELECT - users can only access oauth_data for projects they have access to
CREATE POLICY "Users can view oauth_data for accessible projects" ON public.social_provider_connection_oauth_data
    FOR SELECT
        USING (user_has_project_access(project_id));

-- Create RLS policy for INSERT - users can only insert oauth_data for projects they have access to
CREATE POLICY "Users can insert oauth_data for accessible projects" ON public.social_provider_connection_oauth_data
    FOR INSERT
        WITH CHECK (user_has_project_access(project_id));

-- Create RLS policy for UPDATE - users can only update oauth_data for projects they have access to
CREATE POLICY "Users can update oauth_data for accessible projects" ON public.social_provider_connection_oauth_data
    FOR UPDATE
        USING (user_has_project_access(project_id))
        WITH CHECK (user_has_project_access(project_id));

-- Create RLS policy for DELETE - users can only delete oauth_data for projects they have access to
CREATE POLICY "Users can delete oauth_data for accessible projects" ON public.social_provider_connection_oauth_data
    FOR DELETE
        USING (user_has_project_access(project_id));

