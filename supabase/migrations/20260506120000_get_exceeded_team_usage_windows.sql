--
-- Function to return active exceeded team usage windows with team billing metadata
CREATE OR REPLACE FUNCTION public.get_exceeded_team_usage_windows()
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
      AND usage.count > usage."limit";
$$;
