-- ============================================================
-- Seed Script: 999_cleanup.sql
-- Remove any helper functions created during seeding in 00_setup.sql
-- ============================================================

DROP FUNCTION IF EXISTS get_user_id(text);

DROP FUNCTION IF EXISTS get_team_id(text);

DROP FUNCTION IF EXISTS get_project_id(text);
