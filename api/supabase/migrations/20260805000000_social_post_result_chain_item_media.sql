CREATE TABLE public.social_post_result_chain_item_media(
    id text PRIMARY KEY DEFAULT nanoid('sprcim'),
    social_post_result_id text NOT NULL REFERENCES social_post_results(id),
    social_post_chain_item_media_id text NOT NULL REFERENCES social_post_chain_item_media(id)
);

CREATE INDEX social_post_result_chain_item_media_result_id_idx ON public.social_post_result_chain_item_media(social_post_result_id);

CREATE INDEX social_post_result_chain_item_media_media_id_idx ON public.social_post_result_chain_item_media(social_post_chain_item_media_id);


ALTER TABLE public.social_post_result_chain_item_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social post result chain item media" ON public.social_post_result_chain_item_media
    FOR SELECT
        USING (user_has_post_result_access(social_post_result_id));

CREATE POLICY "Users can insert their own social post result chain item media" ON public.social_post_result_chain_item_media
    FOR INSERT
        WITH CHECK (user_has_post_result_access(social_post_result_id));

CREATE POLICY "Users can update their own social post result chain item media" ON public.social_post_result_chain_item_media
    FOR UPDATE
        USING (user_has_post_result_access(social_post_result_id))
        WITH CHECK (user_has_post_result_access(social_post_result_id));

CREATE POLICY "Users can delete their own social post result chain item media" ON public.social_post_result_chain_item_media
    FOR DELETE
        USING (user_has_post_result_access(social_post_result_id));
