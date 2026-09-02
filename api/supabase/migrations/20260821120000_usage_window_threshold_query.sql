--
-- Distinct notification type for subscription-change communications.
-- 'usage_alert' is the informational 80/90/95% threshold-warning group (no
-- action taken; the crossed threshold and limits ride along in meta_data as
-- read-only context), while 'subscription_alert' records that the team's
-- subscription was actually changed (e.g. auto-upgraded for the next billing
-- period after exceeding their plan limit) — the email is a side effect of
-- that action, so it is a separate domain at the type level, not a metadata
-- variant of the informational alerts.
ALTER TYPE notification_type ADD VALUE 'subscription_alert';


--
-- Single parameterized fetch for the usage-limits cron: every in-window team
-- at or above `threshold_percent` percent of its post limit. Bucketing the
-- results (80/90/95% warnings vs the strictly-over-limit upgrade flow) is
-- business logic and lives in the JS consumer
-- (trigger/process-usage-limits.ts), so threshold changes never need a
-- migration.
--
-- Replaces get_exceeded_team_usage_windows(), which baked the
-- exceeded-vs-active split into SQL.
DROP FUNCTION IF EXISTS public.get_exceeded_team_usage_windows();

CREATE FUNCTION public.get_team_usage_windows_over_threshold(threshold_percent int)
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
      AND usage.count * 100 >= usage."limit" * threshold_percent;
$$;

-- The threshold is a runtime parameter, so a partial index can't serve it;
-- cover the current-window scan instead and let the count comparison filter
-- the (one-row-per-team) result.
CREATE INDEX idx_social_post_team_usage_current_window
    ON public.social_post_team_usage(end_at, start_at)
    INCLUDE (team_id, count, "limit");
