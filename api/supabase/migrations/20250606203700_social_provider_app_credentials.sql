--
-- Social Provider Enum
create type social_provider as enum ('facebook', 'instagram', 'x', 'tiktok', 'youtube', 'pinterest', 'linkedin', 'bluesky', 'threads');

--
-- Social Account Credentials
create table social_provider_app_credentials (
    provider social_provider not null,
    project_id text not null references projects(id) on delete cascade,
    app_id text,
    app_secret text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (provider, project_id)
);

--
-- indexes
create index social_provider_app_credentials_project_id_idx on social_provider_app_credentials(project_id);
create index social_provider_app_credentials_provider_idx on social_provider_app_credentials(provider);
create index social_provider_app_credentials_created_at_idx on social_provider_app_credentials(created_at);
create index social_provider_app_credentials_updated_at_idx on social_provider_app_credentials(updated_at);

--
-- RLS
alter table social_provider_app_credentials enable row level security;

create policy "Users can view social credentials for their team projects"
on social_provider_app_credentials for select
using (user_has_project_access(project_id));

create policy "Users can create social credentials for their team projects"
on social_provider_app_credentials for insert
with check (user_has_project_access(project_id));

create policy "Users can update social credentials for their team projects"
on social_provider_app_credentials for update
using (user_has_project_access(project_id))
with check (user_has_project_access(project_id));

create policy "Users can delete social credentials for their team projects"
on social_provider_app_credentials for delete
using (user_has_project_access(project_id));