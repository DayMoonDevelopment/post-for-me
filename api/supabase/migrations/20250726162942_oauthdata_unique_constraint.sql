ALTER TABLE social_provider_connection_oauth_data 
ADD CONSTRAINT social_provider_connection_oauth_data_unique 
UNIQUE (project_id, provider, key_id, key);