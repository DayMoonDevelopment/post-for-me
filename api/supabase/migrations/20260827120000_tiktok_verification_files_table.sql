--
-- TikTok domain-verification files, tracked independently of the storage
-- backend. The previous `v_tiktok_verification_files` view read Supabase's
-- `storage.objects` directly, so files uploaded to R2 (which never touches
-- `storage.objects`) were invisible to it. Recording `provider` here also
-- lets the public `/callback/:filename.txt` route (which has no team/project
-- context to run the `r2-storage` feature flag against) look up the right
-- backend directly instead of guessing via sequential try/fallback.
create table tiktok_verification_files (
    id uuid primary key default gen_random_uuid(),
    project_id text not null references projects(id) on delete cascade,
    provider text not null check (provider in ('supabase', 'r2')),
    bucket text not null,
    key text not null,
    file_name text not null unique,
    created_at timestamptz not null default now()
);

--
-- indexes
create index tiktok_verification_files_project_id_idx on tiktok_verification_files(project_id);

--
-- RLS
alter table tiktok_verification_files enable row level security;

create policy "Users can view tiktok verification files for their team projects"
on tiktok_verification_files for select
using (user_has_project_access(project_id));

create policy "Users can create tiktok verification files for their team projects"
on tiktok_verification_files for insert
with check (user_has_project_access(project_id));

create policy "Users can delete tiktok verification files for their team projects"
on tiktok_verification_files for delete
using (user_has_project_access(project_id));

--
-- Superseded by the table above.
drop view if exists public.v_tiktok_verification_files;
