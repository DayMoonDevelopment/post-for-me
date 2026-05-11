--
-- Social Account Credentials
CREATE TABLE system_social_provider_app_credentials(
    id text PRIMARY KEY DEFAULT nanoid('ssp'),
    provider social_provider NOT NULL,
    app_id text,
    app_secret text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

--
-- indexes
CREATE INDEX system_social_provider_app_credentials_provider_idx ON system_social_provider_app_credentials(provider);

CREATE INDEX system_social_provider_app_credentials_created_at_idx ON system_social_provider_app_credentials(created_at);

CREATE INDEX system_social_provider_app_credentials_updated_at_idx ON system_social_provider_app_credentials(updated_at);

--
-- RLS
ALTER TABLE system_social_provider_app_credentials ENABLE ROW LEVEL SECURITY;

