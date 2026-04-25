------------------------------- 1. ARTICLES: AUTHORS ------------------
CREATE TABLE cms.authors (
    id text PRIMARY KEY DEFAULT nanoid('aut'),
    slug text NOT NULL,
    name text NOT NULL,
    image_url text,
    bio text,
    role text,
    socials jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_cms_authors_slug ON cms.authors(slug) WHERE deleted_at IS NULL;

------------------------------- 2. ARTICLES: CATEGORIES --------------
CREATE TABLE cms.categories (
    id text PRIMARY KEY DEFAULT nanoid('cat'),
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_cms_categories_slug ON cms.categories(slug) WHERE deleted_at IS NULL;

------------------------------- 3. ARTICLES: TAGS --------------------
CREATE TABLE cms.tags (
    id text PRIMARY KEY DEFAULT nanoid('tag'),
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_cms_tags_slug ON cms.tags(slug) WHERE deleted_at IS NULL;

------------------------------- 4. ARTICLES --------------------------
CREATE TABLE cms.articles (
    id text PRIMARY KEY DEFAULT nanoid('art'),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    content text,
    content_format text NOT NULL DEFAULT 'html' CHECK (content_format IN ('html','markdown')),
    cover_image_url text,
    featured boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
    attribution jsonb,
    category_id text REFERENCES cms.categories(id) ON DELETE SET NULL,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX idx_cms_articles_status_published_at
    ON cms.articles(status, published_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_cms_articles_category_id
    ON cms.articles(category_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_cms_articles_featured
    ON cms.articles(featured)
    WHERE featured = true AND deleted_at IS NULL;

CREATE INDEX idx_cms_articles_slug
    ON cms.articles(slug)
    WHERE deleted_at IS NULL;

------------------------------- 5. JOIN TABLES -----------------------
CREATE TABLE cms.article_authors (
    article_id text NOT NULL REFERENCES cms.articles(id) ON DELETE CASCADE,
    author_id text NOT NULL REFERENCES cms.authors(id) ON DELETE CASCADE,
    position integer NOT NULL DEFAULT 0,
    PRIMARY KEY (article_id, author_id)
);

CREATE INDEX idx_cms_article_authors_author_id ON cms.article_authors(author_id);

CREATE TABLE cms.article_tags (
    article_id text NOT NULL REFERENCES cms.articles(id) ON DELETE CASCADE,
    tag_id text NOT NULL REFERENCES cms.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_cms_article_tags_tag_id ON cms.article_tags(tag_id);

------------------------------- 6. TRIGGERS --------------------------
CREATE TRIGGER trg_cms_authors_updated
    BEFORE UPDATE ON cms.authors
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_cms_categories_updated
    BEFORE UPDATE ON cms.categories
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_cms_tags_updated
    BEFORE UPDATE ON cms.tags
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_cms_articles_updated
    BEFORE UPDATE ON cms.articles
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

------------------------------- 7. RLS -------------------------------
ALTER TABLE cms.authors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.articles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.article_authors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.article_tags     ENABLE ROW LEVEL SECURITY;

/* Public can read live (non-deleted) reference data. */
CREATE POLICY "Public read: authors"
    ON cms.authors FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Public read: categories"
    ON cms.categories FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Public read: tags"
    ON cms.tags FOR SELECT
    USING (deleted_at IS NULL);

/* Articles: only published, non-deleted rows are publicly readable. */
CREATE POLICY "Public read: articles"
    ON cms.articles FOR SELECT
    USING (status = 'published' AND deleted_at IS NULL);

/* Joins are visible only when the article side is visible. */
CREATE POLICY "Public read: article_authors"
    ON cms.article_authors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cms.articles a
            WHERE a.id = article_authors.article_id
              AND a.status = 'published'
              AND a.deleted_at IS NULL
        )
    );

CREATE POLICY "Public read: article_tags"
    ON cms.article_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cms.articles a
            WHERE a.id = article_tags.article_id
              AND a.status = 'published'
              AND a.deleted_at IS NULL
        )
    );

/* ---------- Done ✔︎ ------------------------------------------- */
