-- Function to check if a project is a system project
CREATE OR REPLACE FUNCTION is_system_project(project_id_param text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER STABLE
    AS $$
    SELECT
        is_system
    FROM
        projects
    WHERE
        id = project_id_param;
$$;

-- Drop existing RLS policies for social_provider_app_credentials
DROP POLICY IF EXISTS "Users can view social credentials for their team projects" ON social_provider_app_credentials;

DROP POLICY IF EXISTS "Users can create social credentials for their team projects" ON social_provider_app_credentials;

DROP POLICY IF EXISTS "Users can update social credentials for their team projects" ON social_provider_app_credentials;

DROP POLICY IF EXISTS "Users can delete social credentials for their team projects" ON social_provider_app_credentials;

-- Create new RLS policies that deny access to system projects
CREATE POLICY "Users can view social credentials for their team projects (non-system only)" ON social_provider_app_credentials
    FOR SELECT
        USING ((
            SELECT
                user_has_project_access(project_id))
                AND NOT (
                    SELECT
                        is_system_project(project_id)));

CREATE POLICY "Users can create social credentials for their team projects (non-system only)" ON social_provider_app_credentials
    FOR INSERT
        WITH CHECK ((
            SELECT
                user_has_project_access(project_id))
                AND NOT (
                    SELECT
                        is_system_project(project_id)));

CREATE POLICY "Users can update social credentials for their team projects (non-system only)" ON social_provider_app_credentials
    FOR UPDATE
        USING ((
            SELECT
                user_has_project_access(project_id))
                AND NOT (
                    SELECT
                        is_system_project(project_id)))
                    WITH CHECK ((
                        SELECT
                            user_has_project_access(project_id))
                            AND NOT (
                                SELECT
                                    is_system_project(project_id)));

CREATE POLICY "Users can delete social credentials for their team projects (non-system only)" ON social_provider_app_credentials
    FOR DELETE
        USING ((
            SELECT
                user_has_project_access(project_id))
                AND NOT (
                    SELECT
                        is_system_project(project_id)));

