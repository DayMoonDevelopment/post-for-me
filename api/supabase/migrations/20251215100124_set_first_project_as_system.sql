-- Update create_project_for_team function to set is_system = true for first project
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
        INSERT INTO public.projects(name, team_id, created_by, updated_by, is_system)
            VALUES ('New Project', NEW.id, NEW.created_by, NEW.created_by, TRUE);
    END IF;
    RETURN NEW;
END;
$$;
