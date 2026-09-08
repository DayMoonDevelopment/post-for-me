--
-- Social Post Chain Items
-- Ordered follow-up items in a reply chain (thread), hanging off a single social_posts row.
-- The root post's content stays in social_posts/social_post_media/social_post_configurations;
-- this table holds only items 1..N of the chain (the replies). A post "is a chain" iff it has
-- rows here.
CREATE TABLE public.social_post_chain_items(
    id text PRIMARY KEY DEFAULT nanoid('spci'),
    post_id text NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    sequence smallint NOT NULL CHECK (sequence >= 1),
    caption text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, sequence)
);

--
-- Indexes
CREATE INDEX social_post_chain_items_post_id_idx ON public.social_post_chain_items(post_id);

--
-- RLS
ALTER TABLE public.social_post_chain_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social post chain items" ON public.social_post_chain_items
    FOR SELECT
        USING (user_has_post_access(post_id));

CREATE POLICY "Users can insert their own social post chain items" ON public.social_post_chain_items
    FOR INSERT
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can update their own social post chain items" ON public.social_post_chain_items
    FOR UPDATE
        USING (user_has_post_access(post_id))
        WITH CHECK (user_has_post_access(post_id));

CREATE POLICY "Users can delete their own social post chain items" ON public.social_post_chain_items
    FOR DELETE
        USING (user_has_post_access(post_id));

--
-- Social Post Chain Item Media
CREATE TABLE public.social_post_chain_item_media(
    id text PRIMARY KEY DEFAULT nanoid('spcim'),
    chain_item_id text NOT NULL REFERENCES social_post_chain_items(id) ON DELETE CASCADE,
    url text NOT NULL,
    thumbnail_url text NULL,
    thumbnail_timestamp_ms int NULL,
    tags jsonb NULL,
    skip_processing boolean NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

--
-- Indexes
CREATE INDEX social_post_chain_item_media_chain_item_id_idx ON public.social_post_chain_item_media(chain_item_id);

--
-- Function to check if current user has access to a chain item
CREATE OR REPLACE FUNCTION user_has_chain_item_access(chain_item_id text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER STABLE
    AS $$
    SELECT
        EXISTS(
            SELECT
                1
            FROM
                social_post_chain_items sci
                JOIN social_posts sp ON sp.id = sci.post_id
                JOIN projects p ON p.id = sp.project_id
                JOIN team_users tm ON p.team_id = tm.team_id
            WHERE
                sci.id = chain_item_id
                AND tm.user_id = auth.uid());
$$;

--
-- RLS
ALTER TABLE public.social_post_chain_item_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social post chain item media" ON public.social_post_chain_item_media
    FOR SELECT
        USING (user_has_chain_item_access(chain_item_id));

CREATE POLICY "Users can insert their own social post chain item media" ON public.social_post_chain_item_media
    FOR INSERT
        WITH CHECK (user_has_chain_item_access(chain_item_id));

CREATE POLICY "Users can update their own social post chain item media" ON public.social_post_chain_item_media
    FOR UPDATE
        USING (user_has_chain_item_access(chain_item_id))
        WITH CHECK (user_has_chain_item_access(chain_item_id));

CREATE POLICY "Users can delete their own social post chain item media" ON public.social_post_chain_item_media
    FOR DELETE
        USING (user_has_chain_item_access(chain_item_id));

--
-- Link social post results to the chain item they belong to. NULL means the result is for the
-- root post; existing rows are unaffected since the column defaults to NULL.
ALTER TABLE public.social_post_results
    ADD COLUMN chain_item_id text NULL REFERENCES social_post_chain_items(id) ON DELETE CASCADE;

CREATE INDEX social_post_results_chain_item_id_idx ON public.social_post_results(chain_item_id)
WHERE
    chain_item_id IS NOT NULL;
