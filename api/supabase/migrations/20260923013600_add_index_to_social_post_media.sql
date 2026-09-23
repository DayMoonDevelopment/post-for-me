ALTER TABLE social_post_media
    ADD COLUMN index integer NOT NULL DEFAULT 0;

-- Backfill existing rows with a per-post sequential index derived from their
-- prior implicit order, so queries that now `ORDER BY index` don't scramble
-- media that predates this column. created_at is identical for rows inserted
-- in the same batch, so ctid (physical insertion order) breaks ties.
WITH ordered_media AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY created_at, ctid) - 1 AS ordinal
    FROM social_post_media
)
UPDATE social_post_media
SET index = ordered_media.ordinal
FROM ordered_media
WHERE social_post_media.id = ordered_media.id;
