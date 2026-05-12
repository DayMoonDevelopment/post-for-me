--
-- Function to check if current user has access to a project
create or replace function user_has_project_access(project_id text)
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1 from projects p
        join team_users tm on p.team_id = tm.team_id
        where p.id = project_id
        and tm.user_id = auth.uid()
    );
$$;