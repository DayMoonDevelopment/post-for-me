-- The post-media object a storage URL names, whatever its host, path style or
-- query string: lets a storage cleanup find the posts that use an object.
CREATE OR REPLACE FUNCTION public.post_media_object_name(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT substring(
        url FROM '/storage/v1/(?:object|render/image)/(?:(?:public|sign|authenticated)/)?post-media/([^?#]+)'
    )
$$;

-- On production, create these first with CREATE INDEX CONCURRENTLY: building
-- them here blocks writes to social_post_media while they build.
CREATE INDEX IF NOT EXISTS idx_social_post_media_url_object
    ON public.social_post_media (public.post_media_object_name(url))
    WHERE public.post_media_object_name(url) IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_social_post_media_thumbnail_object
    ON public.social_post_media (public.post_media_object_name(thumbnail_url))
    WHERE public.post_media_object_name(thumbnail_url) IS NOT NULL;
