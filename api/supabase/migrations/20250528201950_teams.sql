--
-- create the teams table
CREATE TABLE public.teams (
    id text DEFAULT nanoid('team') PRIMARY KEY,
    name text NOT NULL,
    billing_email text NULL,
    stripe_customer_id text NULL,
    created_by uuid DEFAULT auth.uid() NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid DEFAULT auth.uid() NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);

CREATE INDEX idx_teams_created_by ON public.teams(created_by);
CREATE INDEX idx_teams_updated_by ON public.teams(updated_by);

--
-- Create team_users join table
CREATE TABLE public.team_users (
    team_id text REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid DEFAULT auth.uid() NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid DEFAULT auth.uid() NULL REFERENCES public.users(id) ON DELETE SET NULL,
    PRIMARY KEY (team_id, user_id)
);

CREATE INDEX idx_team_users_created_by ON public.team_users(created_by);
CREATE INDEX idx_team_users_updated_by ON public.team_users(updated_by);
CREATE INDEX idx_team_users_team_id ON public.team_users(team_id);
CREATE INDEX idx_team_users_user_id ON public.team_users(user_id);

--
-- Create helper function for team membership check
CREATE OR REPLACE FUNCTION public.is_team_member(team_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_users
        WHERE team_users.team_id = $1
        AND team_users.user_id = auth.uid()
    );
$$;

--
-- Enable RLS on the teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any authenticated user can create a team" ON public.teams
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users update teams where they are a member" ON public.teams
    FOR UPDATE
    TO authenticated
    USING (is_team_member(id));

CREATE POLICY "Users select teams where they are a member" ON public.teams
    FOR SELECT
    TO authenticated
    USING (is_team_member(id));

CREATE POLICY "Users delete teams where they are a member" ON public.teams
    FOR DELETE
    TO authenticated
    USING (is_team_member(id));

--
-- Enable RLS on team_users tables
ALTER TABLE public.team_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select team_users on teams where they are a member" ON public.team_users
    FOR SELECT
    TO authenticated
    USING (is_team_member(team_id));

CREATE POLICY "Users update team_users on teams where they are a member" ON public.team_users
    FOR UPDATE
    TO authenticated
    USING (is_team_member(team_id));

CREATE POLICY "Users insert team_users on teams where they are a member" ON public.team_users
    FOR INSERT
    TO authenticated
    WITH CHECK (is_team_member(team_id));

CREATE POLICY "Users delete team_users on teams where they are a member" ON public.team_users
    FOR DELETE
    TO authenticated
    USING (is_team_member(team_id));

--
-- Add a record to team_users when a team is created for the user who created it
CREATE OR REPLACE FUNCTION after_team_insert()
RETURNS TRIGGER 
LANGUAGE PLPGSQL
SECURITY DEFINER
VOLATILE
SET search_path = public, auth
AS $$
  BEGIN
  IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.team_users (team_id, user_id, created_by, updated_by)
      VALUES (NEW.id, NEW.created_by, NEW.created_by, NEW.created_by);
  END IF;
  
  RETURN NEW;
  END;
$$;

CREATE TRIGGER on_team_user_insert
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION after_team_insert();