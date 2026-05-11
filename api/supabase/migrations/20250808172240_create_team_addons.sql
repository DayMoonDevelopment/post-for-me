--
-- addon types
CREATE TYPE subscription_addon AS enum(
    'managed_system_credentials'
);

--
-- Team Addons
CREATE TABLE public.team_addons(
    id text PRIMARY KEY DEFAULT nanoid('ta'),
    team_id text NOT NULL REFERENCES teams(id),
    addon subscription_addon NOT NULL,
    expires_at timestamptz NOT NULL,
    UNIQUE (team_id, addon)
);

-- Enable RLS on the teams table
ALTER TABLE public.team_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select teams where they are a member" ON public.team_addons
    FOR SELECT TO authenticated
        USING (is_team_member(team_id));

CREATE INDEX idx_team_addon_expires ON public.team_addons(team_id, addon, expires_at);

CREATE INDEX idx_team_addon ON public.team_addons(team_id, addon);

