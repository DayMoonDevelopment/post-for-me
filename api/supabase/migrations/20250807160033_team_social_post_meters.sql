--
-- Team Social Post Meters
CREATE TABLE public.team_social_post_meters(
    id text PRIMARY KEY DEFAULT nanoid('tspm'),
    team_id text NOT NULL REFERENCES teams(id),
    month int NOT NULL,
    day int NOT NULL,
    year int NOT NULL,
    hour int NOT NULL,
    minute int NOT NULL,
    provider social_provider NOT NULL,
    count int NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_social_post_meters ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_team_social_post_date ON public.team_social_post_meters(team_id, month, day, year, hour, minute, provider);

-- Function to increment meter value
CREATE OR REPLACE FUNCTION increment_team_social_post_meter(p_team_id text, p_day int, p_month int, p_hour int, p_min int, p_year int, p_provider social_provider)
    RETURNS void
    AS $$
BEGIN
    -- Insert or update the meter
    INSERT INTO public.team_social_post_meters(team_id, month, day, year, hour, minute, provider, count)
        VALUES(p_team_id, p_month, p_day, p_year, p_hour, p_min, p_provider, 1)
    ON CONFLICT(team_id, month, day, year, hour, minute, provider)
        DO UPDATE SET
            count = team_social_post_meters.count + 1;
END;
$$
LANGUAGE plpgsql;

