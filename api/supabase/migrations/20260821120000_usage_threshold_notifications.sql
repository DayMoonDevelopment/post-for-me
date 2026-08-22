--
-- Per-threshold notification types for 80/90/95% usage warnings.
-- Existing 'usage_alert' value is left as-is for the current 100% flow.
ALTER TYPE notification_type ADD VALUE 'usage_alert_80';
ALTER TYPE notification_type ADD VALUE 'usage_alert_90';
ALTER TYPE notification_type ADD VALUE 'usage_alert_95';


--
-- Function to return active team usage windows that have NOT exceeded their
-- limit — the complement of get_exceeded_team_usage_windows(), used to detect
-- 80/90/95% warning thresholds without a second Stripe lookup.
-- Uses a strict `<` so a team at exactly 100% of its limit is classified as
-- exceeded (see get_exceeded_team_usage_windows(), fixed to `>=` in a later
-- migration), not as merely "active", keeping the two functions a true
-- partition of all in-window teams.
CREATE OR REPLACE FUNCTION public.get_active_team_usage_windows()
RETURNS TABLE (
    team_id text,
    count int,
    "limit" int,
    start_at timestamptz,
    end_at timestamptz,
    team_name text,
    stripe_customer_id text
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        usage.team_id,
        usage.count,
        usage."limit",
        usage.start_at,
        usage.end_at,
        team.name AS team_name,
        team.stripe_customer_id
    FROM public.social_post_team_usage usage
    INNER JOIN public.teams team ON team.id = usage.team_id
    WHERE usage.start_at <= now()
      AND usage.end_at > now()
      AND usage.count < usage."limit";
$$;


CREATE INDEX idx_social_post_team_usage_active_window
    ON public.social_post_team_usage(end_at, start_at)
    INCLUDE (team_id, count, "limit")
    WHERE count < "limit";
