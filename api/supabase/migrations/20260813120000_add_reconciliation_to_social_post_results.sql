ALTER TABLE public.social_post_results
    ADD COLUMN is_processing boolean NOT NULL DEFAULT false,
    ADD COLUMN reconciliation_attempts integer NOT NULL DEFAULT 0,
    ADD COLUMN reconciliation_deadline_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_social_post_results_is_processing
    ON public.social_post_results(is_processing)
    WHERE is_processing = true;
