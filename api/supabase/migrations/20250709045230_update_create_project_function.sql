-- Drop and recreate the function with updated logic
CREATE OR REPLACE FUNCTION create_project_for_team()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    SECURITY DEFINER VOLATILE
    SET search_path = public, auth
    AS $$
DECLARE
    user_first_name text;
BEGIN
    -- Get the user's first name from the users table
    IF NEW.created_by IS NOT NULL THEN
        SELECT first_name INTO user_first_name 
        FROM public.users 
        WHERE id = NEW.created_by;
        
        -- Create project with personalized name
        INSERT INTO public.projects(name, team_id, created_by, updated_by)
            VALUES (
                COALESCE(user_first_name || '''s First Project', 'My First Project'), 
                NEW.id, 
                NEW.created_by, 
                NEW.created_by
            );
    END IF;
    RETURN NEW;
END;
$$;