CREATE TABLE public.projects(
    id text DEFAULT nanoid('proj') PRIMARY KEY,
    name text NOT NULL,
    description text NULL,
    auth_callback_url text NULL,
    team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    created_by uuid DEFAULT auth.uid() NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid DEFAULT auth.uid() NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);

CREATE INDEX idx_projects_team_id ON public.projects(team_id);

CREATE INDEX idx_projects_created_by ON public.projects(created_by);

CREATE INDEX idx_projects_updated_by ON public.projects(updated_by);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can insert projects" ON public.projects
    FOR INSERT TO authenticated
        WITH CHECK ((
            SELECT
                is_team_member(team_id)));

CREATE POLICY "Team members can update projects" ON public.projects
    FOR UPDATE TO authenticated
        USING ((
            SELECT
                is_team_member(team_id)))
            WITH CHECK ((
                SELECT
                    is_team_member(team_id)));

CREATE POLICY "Team members can select projects" ON public.projects
    FOR SELECT TO authenticated
        USING ((
            SELECT
                is_team_member(team_id)));

CREATE POLICY "Team members can delete projects" ON public.projects
    FOR DELETE TO authenticated
        USING ((
            SELECT
                is_team_member(team_id)));

CREATE OR REPLACE FUNCTION create_project_for_team()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    SECURITY DEFINER VOLATILE
    SET search_path = public, auth
    AS $$
DECLARE
    user_first_name text;
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.projects(name, team_id, created_by, updated_by)
            VALUES ('New Project', NEW.id, NEW.created_by, NEW.created_by);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER create_project_after_team_insert
    AFTER INSERT ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION create_project_for_team();

