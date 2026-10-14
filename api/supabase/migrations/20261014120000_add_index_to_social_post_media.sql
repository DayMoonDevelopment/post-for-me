ALTER TABLE social_post_media
    ADD COLUMN index integer NOT NULL DEFAULT 0;

-- Backfill media for draft and scheduled posts only, leaving processing and
-- completed posts untouched. Use a per-post sequential index derived from their
-- prior implicit order, so queries that now `ORDER BY index` don't scramble
-- media that predates this column. created_at is identical for rows inserted
-- in the same batch, so ctid (physical insertion order) breaks ties.
WITH ordered_media AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY created_at, ctid) - 1 AS ordinal
    FROM social_post_media
    WHERE post_id IN (
        SELECT id
        FROM social_posts
        WHERE status IN ('draft', 'scheduled')
    )
)
UPDATE social_post_media
SET index = ordered_media.ordinal
FROM ordered_media
WHERE social_post_media.id = ordered_media.id;
