CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_post_at_id
ON public.social_posts(post_at ASC, id ASC)
WHERE status = 'scheduled';
