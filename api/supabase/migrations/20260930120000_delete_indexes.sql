-- Support foreign-key lookups performed by cascading deletes and SET NULL actions.
CREATE INDEX IF NOT EXISTS idx_social_post_configurations_provider_connection_id
    ON public.social_post_configurations(provider_connection_id);

CREATE INDEX IF NOT EXISTS idx_social_post_media_provider_connection_id
    ON public.social_post_media(provider_connection_id);

CREATE INDEX IF NOT EXISTS idx_pagination_data_provider_connection_id
    ON public.social_provider_connection_pagination_data(provider_connection_id);

CREATE INDEX IF NOT EXISTS idx_social_post_result_post_media_media_id
    ON public.social_post_result_post_media(social_post_media_id);

-- The existing category index excludes soft-deleted articles, which still need
-- to be found when a category deletion sets their category_id to NULL.
CREATE INDEX IF NOT EXISTS idx_cms_articles_category_id_all
    ON cms.articles(category_id);
