--
-- Social Post Result Delete Status
CREATE TYPE social_post_result_delete_status AS enum(
    'not_deleted',
    'deleting',
    'deleted',
    'delete_failed'
);

--
-- Social Post Results
ALTER TABLE public.social_post_results
    ADD COLUMN delete_status social_post_result_delete_status NOT NULL DEFAULT 'not_deleted',
    ADD COLUMN delete_error_message text NULL,
    ADD COLUMN deleted_at timestamptz NULL;
