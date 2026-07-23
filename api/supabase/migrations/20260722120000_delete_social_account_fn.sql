--
-- Delete a social account and reconcile scheduled/draft posts that reference it.
--
-- - Scheduled/draft posts whose ONLY account is this connection are deleted
--   outright (their child rows cascade via existing FKs), rather than being
--   left referencing zero accounts.
-- - Media/configuration rows scoped to this connection on posts that still
--   have other accounts are explicitly removed, rather than relying on
--   ON DELETE SET NULL, which would otherwise silently reclassify them as
--   applying to the whole post.
CREATE OR REPLACE FUNCTION delete_social_account(p_id text, p_project_id text)
    RETURNS TABLE(
        id text,
        external_id text,
        caption text,
        status social_post_status,
        post_at timestamptz,
        project_id text,
        created_at timestamptz,
        updated_at timestamptz)
    AS $$
#variable_conflict use_column
BEGIN
    IF NOT EXISTS (
        SELECT
            1
        FROM
            social_provider_connections spc
        WHERE
            spc.id = p_id
            AND spc.project_id = p_project_id) THEN
    RAISE EXCEPTION 'Social account not found';
END IF;

    RETURN QUERY WITH orphaned_posts AS (
        SELECT
            sp.id
        FROM
            social_posts sp
        WHERE
            sp.project_id = p_project_id
            AND sp.status IN ('scheduled', 'draft')
            AND EXISTS (
                SELECT
                    1
                FROM
                    social_post_provider_connections sppc
                WHERE
                    sppc.post_id = sp.id
                    AND sppc.provider_connection_id = p_id)
                AND (
                    SELECT
                        count(*)
                    FROM
                        social_post_provider_connections sppc
                    WHERE
                        sppc.post_id = sp.id) = 1
),
deleted_posts AS (
    DELETE FROM social_posts sp USING orphaned_posts op
    WHERE sp.id = op.id
    RETURNING sp.id, sp.external_id, sp.caption, sp.status, sp.post_at, sp.project_id, sp.created_at, sp.updated_at
),
cleared_media AS (
    DELETE FROM social_post_media spm
    WHERE spm.provider_connection_id = p_id
        AND spm.post_id NOT IN (
            SELECT
                id
            FROM orphaned_posts)
),
cleared_configurations AS (
    DELETE FROM social_post_configurations spc
    WHERE spc.provider_connection_id = p_id
        AND spc.post_id NOT IN (
            SELECT
                id
            FROM orphaned_posts)
),
deleted_connection AS (
    DELETE FROM social_provider_connections spc
    WHERE spc.id = p_id
        AND spc.project_id = p_project_id
)
    SELECT
        *
    FROM
        deleted_posts;
END;
$$
LANGUAGE plpgsql;
