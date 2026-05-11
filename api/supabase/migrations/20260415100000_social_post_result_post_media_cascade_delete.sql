-- Update social_post_result_post_media foreign keys to cascade on delete

ALTER TABLE public.social_post_result_post_media
    DROP CONSTRAINT social_post_result_post_media_social_post_result_id_fkey;

ALTER TABLE public.social_post_result_post_media
    ADD CONSTRAINT social_post_result_post_media_social_post_result_id_fkey
    FOREIGN KEY (social_post_result_id)
    REFERENCES public.social_post_results(id)
    ON DELETE CASCADE;

ALTER TABLE public.social_post_result_post_media
    DROP CONSTRAINT social_post_result_post_media_social_post_media_id_fkey;

ALTER TABLE public.social_post_result_post_media
    ADD CONSTRAINT social_post_result_post_media_social_post_media_id_fkey
    FOREIGN KEY (social_post_media_id)
    REFERENCES public.social_post_media(id)
    ON DELETE CASCADE;
