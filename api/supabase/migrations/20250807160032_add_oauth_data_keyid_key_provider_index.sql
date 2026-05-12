CREATE INDEX idx_oauth_data_key_keyid_provider ON public.social_provider_connection_oauth_data(provider, key_id, key);

CREATE INDEX idx_oauth_data_key_projectid_provider_keyid ON public.social_provider_connection_oauth_data(project_id, provider, key_id, key);

