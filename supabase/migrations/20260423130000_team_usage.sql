--
-- Team Usage
CREATE TABLE public.team_usage(
    team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    count int NOT NULL DEFAULT 0,
    "limit" int NOT NULL,
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    CONSTRAINT team_usage_unique_window UNIQUE (team_id, start_at, end_at)
);

CREATE INDEX idx_team_usage_latest ON public.team_usage(team_id, end_at DESC, start_at DESC);

ALTER TABLE public.team_usage ENABLE ROW LEVEL SECURITY;

-- Increments the active usage window for a team.
-- If no window exists, or the latest window has ended, a new one is created.
CREATE OR REPLACE FUNCTION public.increment_team_usage(
    p_team_id text,
    p_limit int,
    p_start_at timestamptz,
    p_end_at timestamptz
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_now timestamptz := now();
    v_new_count int;
    v_start_at timestamptz;
    v_end_at timestamptz;
    v_limit int;
BEGIN
    IF p_end_at <= p_start_at THEN
        RAISE EXCEPTION 'end_at must be greater than start_at';
    END IF;

    -- Serialize per team_id so concurrent calls cannot double-create rows.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_team_id, 0));

    SELECT tu.start_at, tu.end_at, tu."limit"
    INTO v_start_at, v_end_at, v_limit
    FROM public.team_usage tu
    WHERE tu.team_id = p_team_id
    ORDER BY tu.end_at DESC, tu.start_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_start_at IS NULL OR v_end_at <= v_now THEN
        INSERT INTO public.team_usage(team_id, count, "limit", start_at, end_at)
            VALUES(
                p_team_id,
                1,
                p_limit,
                p_start_at,
                p_end_at
            )
        RETURNING count INTO v_new_count;
    ELSE
        UPDATE public.team_usage tu
        SET count = tu.count + 1
        WHERE tu.team_id = p_team_id
          AND tu.start_at = v_start_at
          AND tu.end_at = v_end_at
        RETURNING tu.count INTO v_new_count;
    END IF;

    RETURN v_new_count;
END;
$$;
