create table test_social_provider_connections (
    social_provider_connection_id text primary key references social_provider_connections(id) on delete cascade,
    name text null,
    created_at timestamptz default now(),
    created_by uuid references auth.users(id)
);

alter table test_social_provider_connections enable row level security;

create policy "Allow all operations if user has access to social provider connection"
    on test_social_provider_connections
    for all
    using (exists (
        select 1 from social_provider_connections
        where id = test_social_provider_connections.social_provider_connection_id
    ))
    with check (exists (
        select 1 from social_provider_connections
        where id = test_social_provider_connections.social_provider_connection_id
    ));