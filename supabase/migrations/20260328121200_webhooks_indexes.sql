CREATE INDEX IF NOT EXISTS idx_webhook_subscribed_event_types_type_webhook_id ON public.webhook_subscribed_event_types(type, webhook_id);
