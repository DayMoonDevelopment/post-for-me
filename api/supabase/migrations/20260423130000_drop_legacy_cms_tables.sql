-- Drop the legacy CMS tables. Replaced by cms.articles + authors/categories/tags
-- in migration 20260420120000_cms_articles.sql. slug_redirects FK-references
-- resources, so the two must drop together.

DROP TABLE IF EXISTS cms.slug_redirects;
DROP TABLE IF EXISTS cms.resources;
