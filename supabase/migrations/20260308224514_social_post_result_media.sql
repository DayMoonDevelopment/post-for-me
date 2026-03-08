CREATE TABLE public.social_post_result_post_media(
    id text PRIMARY KEY DEFAULT nanoid('sprpm'),
    social_post_result_id text NOT NULL REFERENCES social_post_results(id),
    social_post_media_id text NOT NULL REFERENCES social_post_media(id)
);


-- Function to check if current user has access to a post
CREATE OR REPLACE FUNCTION user_has_post_result_access(post_result_id text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER STABLE
    AS $$
    SELECT
        EXISTS(
            SELECT
                1
            FROM
                social_posts spr
                JOIN social_posts sp ON sp.id = spr.post_id
                JOIN projects p ON p.id = sp.project_id
                JOIN team_users tm ON p.team_id = tm.team_id
            WHERE
                spr.id = post_result_id
                AND tm.user_id = auth.uid());
$$;



ALTER TABLE public.social_post_result_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social post result media" ON public.social_post_result_post_media
    FOR SELECT
        USING (user_has_post_result_access(social_post_result_id));

CREATE POLICY "Users can insert their own social post result media" ON public.social_post_result_post_media
    FOR INSERT
        WITH CHECK (user_has_post_result_access(social_post_result_id));

CREATE POLICY "Users can update their own social post result media" ON public.social_post_result_post_media
    FOR UPDATE
        USING (user_has_post_result_access(social_post_result_id))
        WITH CHECK (user_has_post_result_access(social_post_result_id));

CREATE POLICY "Users can delete their own social post result media" ON public.social_post_result_post_media
    FOR DELETE
        USING (user_has_post_result_access(social_post_result_id));

