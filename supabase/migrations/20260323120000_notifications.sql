--
-- Notification enums
CREATE TYPE notification_type AS enum(
    'usage_alert',
    'general'
);


CREATE TYPE delivery_type AS enum(
    'email'
);

--
-- Team notifications
CREATE TABLE public.team_notifications(
    id text PRIMARY KEY DEFAULT nanoid('tn'),
    team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id text NULL REFERENCES public.projects(id) ON DELETE SET NULL,
    notification_type notification_type NOT NULL,
    delivery_type delivery_type NOT NULL,
    message text NOT NULL,
    meta_data jsonb NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_notifications_team_id ON public.team_notifications(team_id);
CREATE INDEX idx_team_notifications_project_id ON public.team_notifications(project_id);
CREATE INDEX idx_team_notifications_type ON public.team_notifications(team_id, notification_type);
CREATE INDEX idx_team_notifications_created_at ON public.team_notifications(created_at);

ALTER TABLE public.team_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team notifications for their teams" ON public.team_notifications
    FOR SELECT TO authenticated
        USING (is_team_member(team_id));

CREATE POLICY "Users can insert team notifications for their teams" ON public.team_notifications
    FOR INSERT TO authenticated
        WITH CHECK (is_team_member(team_id));

CREATE POLICY "Users can update team notifications for their teams" ON public.team_notifications
    FOR UPDATE TO authenticated
        USING (is_team_member(team_id))
        WITH CHECK (is_team_member(team_id));

CREATE POLICY "Users can delete team notifications for their teams" ON public.team_notifications
    FOR DELETE TO authenticated
        USING (is_team_member(team_id));

