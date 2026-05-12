-- Helper Function: Get User ID by Email
CREATE OR REPLACE FUNCTION get_user_id(user_email TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Helper Function: Get Team ID by Name
CREATE OR REPLACE FUNCTION get_team_id(team_name TEXT)
RETURNS TEXT AS $$
DECLARE
    team_id TEXT;
BEGIN
    SELECT id INTO team_id FROM public.teams WHERE name = team_name;
    RETURN team_id;
END;
$$ LANGUAGE plpgsql;

-- Helper Function: Get Project ID by Name
CREATE OR REPLACE FUNCTION get_project_id(project_name TEXT)
RETURNS TEXT AS $$
DECLARE
    project_id TEXT;
BEGIN
    SELECT id INTO project_id FROM public.projects WHERE name = project_name;
    RETURN project_id;
END;
$$ LANGUAGE plpgsql;
