-- Create oauth_data table
CREATE TABLE public.social_provider_connection_pagination_data(
    id text DEFAULT nanoid('pgn') PRIMARY KEY,
    provider_connection_id text NOT NULL REFERENCES public.social_provider_connections(id) ON DELETE CASCADE,
    metadata jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_pagination_data_connection_id ON public.social_provider_connection_pagination_data(id, provider_connection_id);

-- Enable RLS
ALTER TABLE public.social_provider_connection_pagination_data ENABLE ROW LEVEL SECURITY;

