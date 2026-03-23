--
-- Notification enums
CREATE TYPE notification_type AS enum(
    'email'
);

CREATE TYPE notification_status AS enum(
    'pending',
    'processing',
    'processed'
);

--
-- Team notifications
CREATE TABLE public.team_notifications(
    id text PRIMARY KEY DEFAULT nanoid('tn'),
    team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id text NULL REFERENCES public.projects(id) ON DELETE SET NULL,
    notification_type notification_type NOT NULL,
    message text NOT NULL,
    meta_data jsonb NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_notifications_team_id ON public.team_notifications(team_id);
CREATE INDEX idx_team_notifications_project_id ON public.team_notifications(project_id);
CREATE INDEX idx_team_notifications_pending ON public.team_notifications(status, created_at)
    WHERE status = 'pending';

CREATE TRIGGER trg_team_notifications_updated_at
    BEFORE UPDATE ON public.team_notifications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

--
-- Fetches pending notifications and atomically marks them as processing.
-- Uses FOR UPDATE SKIP LOCKED so concurrent callers do not claim the same rows.
CREATE OR REPLACE FUNCTION public.claim_pending_team_notifications(p_limit integer)
    RETURNS SETOF public.team_notifications
    LANGUAGE sql
    SECURITY DEFINER
    VOLATILE
    SET search_path = public
    AS $$
    WITH to_claim AS (
        SELECT tn.id
        FROM public.team_notifications tn
        WHERE tn.status = 'pending'
        ORDER BY tn.created_at, tn.id
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(COALESCE(p_limit, 0), 0)
    ),
    claimed AS (
        UPDATE public.team_notifications tn
        SET status = 'processing'
        FROM to_claim tc
        WHERE tn.id = tc.id
        RETURNING tn.*
    )
    SELECT *
    FROM claimed
    ORDER BY created_at, id;
$$;
