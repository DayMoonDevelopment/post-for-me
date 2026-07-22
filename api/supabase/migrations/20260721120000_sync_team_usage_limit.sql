--
-- Sync a team's current usage-window limit (e.g. on a Stripe subscription
-- upgrade/downgrade) without touching count or creating a new window.
--
-- increment_team_usage() only sets "limit" when it creates a brand-new
-- window; if a window is already active it just bumps count and silently
-- ignores the limit it was passed. That means a mid-cycle plan change
-- doesn't take effect until the window naturally rolls over. This function
-- lets a billing event push the new limit into the *current* window
-- immediately. It intentionally does nothing if there's no active window —
-- the next real increment_team_usage() call (on the next published post)
-- will create one with the correct limit anyway.
CREATE OR REPLACE FUNCTION public.sync_team_usage_limit(
    p_team_id text,
    p_limit int
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_now timestamptz := now();
    v_start_at timestamptz;
    v_end_at timestamptz;
BEGIN
    -- Serialize per team_id so this can't race increment_team_usage's
    -- read-then-INSERT-or-UPDATE branch for the same team.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_team_id, 0));

    SELECT tu.start_at, tu.end_at
    INTO v_start_at, v_end_at
    FROM public.social_post_team_usage tu
    WHERE tu.team_id = p_team_id
    ORDER BY tu.end_at DESC, tu.start_at DESC
    LIMIT 1
    FOR UPDATE;

    -- No window yet, or the latest window has already ended: nothing to
    -- sync. The next increment_team_usage() call creates a fresh window
    -- with a freshly-computed limit.
    IF v_start_at IS NULL OR v_end_at <= v_now THEN
        RETURN;
    END IF;

    UPDATE public.social_post_team_usage tu
    SET "limit" = p_limit
    WHERE tu.team_id = p_team_id
      AND tu.start_at = v_start_at
      AND tu.end_at = v_end_at;
END;
$$;
