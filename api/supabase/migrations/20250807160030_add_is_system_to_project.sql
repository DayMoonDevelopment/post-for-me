-- Add is_system column to projects table
ALTER TABLE projects
    ADD COLUMN is_system boolean NOT NULL DEFAULT FALSE;

REVOKE UPDATE (is_system) ON TABLE public.projects FROM authenticated;

