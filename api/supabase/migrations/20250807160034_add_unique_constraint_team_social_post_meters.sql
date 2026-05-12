--
-- Add unique constraint to team_social_post_meters
-- Ensures no duplicate entries for the same team, date/time, and provider
--
ALTER TABLE public.team_social_post_meters
    ADD CONSTRAINT team_social_post_meters_unique UNIQUE (team_id, month, day, year, hour, minute, provider);

