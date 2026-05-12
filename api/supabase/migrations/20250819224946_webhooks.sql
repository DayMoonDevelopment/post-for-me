--
-- Webhook Event Type
CREATE TYPE webhook_event_type AS enum(
    'social.post.created',
    'social.post.updated',
    'social.post.deleted',
    'social.post.result.created',
    'social.account.created',
    'social.account.updated'
);

--
-- Webhooks
CREATE TABLE public.webhooks(
    id text PRIMARY KEY DEFAULT nanoid('wbh'),
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    secret_key text NOT NULL,
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

ALTER TABLE public.webhooks
    ADD CONSTRAINT project_webhook_url_unique UNIQUE (project_id, url);

CREATE INDEX idx_webhook_project_id ON public.webhooks(project_id);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Webhook policies
CREATE POLICY "Users can view their own project's webhooks" ON public.webhooks
    FOR SELECT
        USING (user_has_project_access(project_id));

CREATE POLICY "Users can insert into their own project's webhooks" ON public.webhooks
    FOR INSERT
        WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can update their own project's webhooks" ON public.webhooks
    FOR UPDATE
        USING (user_has_project_access(project_id))
        WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "Users can delete their own project's webhooks" ON public.webhooks
    FOR DELETE
        USING (user_has_project_access(project_id));

-- Function to check if current user has access to a webhook
CREATE OR REPLACE FUNCTION user_has_webhook_access(webhook_id text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER STABLE
    AS $$
    SELECT
        EXISTS(
            SELECT
                1
            FROM
                public.webhooks pw
                JOIN public.projects p ON p.id = pw.project_id
                JOIN public.team_users tm ON p.team_id = tm.team_id
            WHERE
                pw.id = webhook_id
                AND tm.user_id = auth.uid());
$$;

CREATE TABLE public.webhook_subscribed_event_types(
    id text PRIMARY KEY DEFAULT nanoid('wbhs'),
    webhook_id text NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    type webhook_event_type NOT NULL
);

ALTER TABLE public.webhook_subscribed_event_types
    ADD CONSTRAINT project_webhook_subscribed_event UNIQUE (webhook_id, type);

CREATE INDEX idx_webhook_id ON public.webhook_subscribed_event_types(webhook_id);

ALTER TABLE public.webhook_subscribed_event_types ENABLE ROW LEVEL SECURITY;

--
-- Webhook subscribed event policies
CREATE POLICY "Users can view their own project's webhook subscribed events" ON public.webhook_subscribed_event_types
    FOR SELECT
        USING (user_has_webhook_access(webhook_id));

CREATE POLICY "Users can insert into their own project's webhook subscribed events" ON public.webhook_subscribed_event_types
    FOR INSERT
        WITH CHECK (user_has_webhook_access(webhook_id));

CREATE POLICY "Users can update their own project's webhook subscribed events" ON public.webhook_subscribed_event_types
    FOR UPDATE
        USING (user_has_webhook_access(webhook_id))
        WITH CHECK (user_has_webhook_access(webhook_id));

CREATE POLICY "Users can delete their own project's webhook subscribed  events" ON public.webhook_subscribed_event_types
    FOR DELETE
        USING (user_has_webhook_access(webhook_id));

--
-- Webhook Event Type
CREATE TYPE webhook_event_status AS enum(
    'pending',
    'processing',
    'completed',
    'failed'
);

--
CREATE TABLE public.webhook_events(
    id text PRIMARY KEY DEFAULT nanoid('wbhe'),
    webhook_id text NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    type webhook_event_type NOT NULL,
    data jsonb NOT NULL,
    status webhook_event_status NOT NULL,
    response jsonb NULL,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX idx_webhook_event_webhook_id ON public.webhook_events(webhook_id);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Webhook event policies
CREATE POLICY "Users can view their own project's webhook events" ON public.webhook_events
    FOR SELECT
        USING (user_has_webhook_access(webhook_id));

CREATE POLICY "Users can insert into their own project's webhook events" ON public.webhook_events
    FOR INSERT
        WITH CHECK (user_has_webhook_access(webhook_id));

CREATE POLICY "Users can update their own project's webhook events" ON public.webhook_events
    FOR UPDATE
        USING (user_has_webhook_access(webhook_id))
        WITH CHECK (user_has_webhook_access(webhook_id));

CREATE POLICY "Users can delete their own project's webhook events" ON public.webhook_events
    FOR DELETE
        USING (user_has_webhook_access(webhook_id));

