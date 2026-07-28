ALTER TYPE social_post_status
    ADD VALUE IF NOT EXISTS 'deleting';

ALTER TYPE social_post_status
    ADD VALUE IF NOT EXISTS 'deleted';

ALTER TYPE social_post_status
    ADD VALUE IF NOT EXISTS 'delete_failed';
