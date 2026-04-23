import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from '../../supabase/supabase.service';

import type { ArticleQueryDto } from './dto/article-query.dto';
import type {
  ArticleResponse,
  ArticlesListResponse,
  AuthorResponse,
  AuthorsListResponse,
  CategoriesListResponse,
  CategoryResponse,
  CmsArticleRow,
  CmsAuthorRow,
  CmsCategoryRow,
  CmsTagRow,
  Pagination,
  Social,
  TagResponse,
  TagsListResponse,
} from './cms.types';

const ARTICLE_ID_PREFIX = 'art_';

type ArticleRowWithJoins = CmsArticleRow & {
  category: CmsCategoryRow | null;
  article_authors: Array<{
    position: number;
    author: CmsAuthorRow;
  }>;
  article_tags: Array<{
    tag: CmsTagRow;
  }>;
};

@Injectable()
export class CmsService {
  private readonly showDrafts: boolean;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.showDrafts =
      this.configService.get<string>('CMS_SHOW_DRAFTS') === 'true';
  }

  private get client(): SupabaseClient {
    return this.supabaseService
      .supabaseServiceRole as unknown as SupabaseClient;
  }

  private articlesTable() {
    return this.client.schema('cms' as never).from('articles');
  }

  private categoriesTable() {
    return this.client.schema('cms' as never).from('categories');
  }

  private tagsTable() {
    return this.client.schema('cms' as never).from('tags');
  }

  private authorsTable() {
    return this.client.schema('cms' as never).from('authors');
  }

  private articleTagsTable() {
    return this.client.schema('cms' as never).from('article_tags');
  }

  async listArticles(query: ArticleQueryDto): Promise<ArticlesListResponse> {
    const limit = query.limit;
    const page = query.page;
    const offset = (page - 1) * limit;

    let builder = this.articlesTable()
      .select(
        `
          id,
          slug,
          title,
          description,
          content,
          content_format,
          cover_image_url,
          cover_video_url,
          featured,
          status,
          attribution,
          category_id,
          published_at,
          created_at,
          updated_at,
          deleted_at,
          category:categories(id, slug, name, description, created_at, updated_at, deleted_at),
          article_authors(position, author:authors(id, slug, name, image_url, bio, role, socials, created_at, updated_at, deleted_at)),
          article_tags(tag:tags(id, slug, name, description, created_at, updated_at, deleted_at))
        `,
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .order('published_at', { ascending: query.order === 'asc' })
      .range(offset, offset + limit - 1);

    if (!this.showDrafts) {
      builder = builder.eq('status', 'published');
    }

    if (query.category?.length) {
      const ids = await this.resolveSlugsToIds('categories', query.category);
      if (ids.length === 0) return this.emptyList(limit, page);
      builder = builder.in('category_id', ids);
    }

    if (query.exclude_category?.length) {
      const ids = await this.resolveSlugsToIds(
        'categories',
        query.exclude_category,
      );
      if (ids.length) {
        builder = builder.not('category_id', 'in', `(${ids.join(',')})`);
      }
    }

    if (query.tag?.length) {
      const articleIds = await this.articleIdsForTagSlugs(query.tag);
      if (articleIds.length === 0) return this.emptyList(limit, page);
      builder = builder.in('id', articleIds);
    }

    if (query.exclude_tag?.length) {
      const articleIds = await this.articleIdsForTagSlugs(query.exclude_tag);
      if (articleIds.length) {
        builder = builder.not('id', 'in', `(${articleIds.join(',')})`);
      }
    }

    if (typeof query.featured === 'boolean') {
      builder = builder.eq('featured', query.featured);
    }

    if (query.q) {
      const pattern = `%${query.q}%`;
      builder = builder.or(
        `title.ilike.${pattern},description.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await builder;

    if (error) {
      console.error('[cms-private] listArticles error', error);
      throw new Error('Failed to fetch articles');
    }

    const rows = (data ?? []) as unknown as ArticleRowWithJoins[];
    const totalItems = count ?? 0;

    return {
      data: rows.map(mapArticle),
      pagination: buildPagination({
        limit,
        currentPage: page,
        totalItems,
      }),
    };
  }

  async getArticle(identifier: string): Promise<ArticleResponse> {
    const lookupColumn = identifier.startsWith(ARTICLE_ID_PREFIX)
      ? 'id'
      : 'slug';

    let builder = this.articlesTable()
      .select(
        `
          id,
          slug,
          title,
          description,
          content,
          content_format,
          cover_image_url,
          cover_video_url,
          featured,
          status,
          attribution,
          category_id,
          published_at,
          created_at,
          updated_at,
          deleted_at,
          category:categories(id, slug, name, description, created_at, updated_at, deleted_at),
          article_authors(position, author:authors(id, slug, name, image_url, bio, role, socials, created_at, updated_at, deleted_at)),
          article_tags(tag:tags(id, slug, name, description, created_at, updated_at, deleted_at))
        `,
      )
      .eq(lookupColumn, identifier)
      .is('deleted_at', null)
      .limit(1);

    if (!this.showDrafts) {
      builder = builder.eq('status', 'published');
    }

    const { data, error } = await builder.maybeSingle();

    if (error) {
      console.error('[cms-private] getArticle error', error);
      throw new Error('Failed to fetch article');
    }

    if (!data) {
      throw new NotFoundException('Article not found');
    }

    return mapArticle(data as unknown as ArticleRowWithJoins);
  }

  async listAuthors(): Promise<AuthorsListResponse> {
    const { data, error } = await this.authorsTable()
      .select('id, slug, name, image_url, bio, role, socials')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('[cms-private] listAuthors error', error);
      throw new Error('Failed to fetch authors');
    }

    return {
      data: ((data ?? []) as unknown as CmsAuthorRow[]).map(mapAuthor),
    };
  }

  async listCategories(): Promise<CategoriesListResponse> {
    const { data, error } = await this.categoriesTable()
      .select('id, slug, name, description')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('[cms-private] listCategories error', error);
      throw new Error('Failed to fetch categories');
    }

    return {
      data: ((data ?? []) as unknown as CmsCategoryRow[]).map(mapCategory),
    };
  }

  async listTags(): Promise<TagsListResponse> {
    const { data, error } = await this.tagsTable()
      .select('id, slug, name, description')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('[cms-private] listTags error', error);
      throw new Error('Failed to fetch tags');
    }

    return {
      data: ((data ?? []) as unknown as CmsTagRow[]).map(mapTag),
    };
  }

  private emptyList(limit: number, page: number): ArticlesListResponse {
    return {
      data: [],
      pagination: buildPagination({ limit, currentPage: page, totalItems: 0 }),
    };
  }

  private async resolveSlugsToIds(
    table: 'categories' | 'tags',
    slugs: string[],
  ): Promise<string[]> {
    const builder =
      table === 'categories' ? this.categoriesTable() : this.tagsTable();

    const { data, error } = await builder
      .select('id')
      .in('slug', slugs)
      .is('deleted_at', null);

    if (error) {
      console.error(`[cms-private] resolveSlugsToIds(${table}) error`, error);
      return [];
    }

    return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  }

  private async articleIdsForTagSlugs(slugs: string[]): Promise<string[]> {
    const tagIds = await this.resolveSlugsToIds('tags', slugs);
    if (tagIds.length === 0) return [];

    const { data, error } = await this.articleTagsTable()
      .select('article_id')
      .in('tag_id', tagIds);

    if (error) {
      console.error('[cms-private] articleIdsForTagSlugs error', error);
      return [];
    }

    return [
      ...new Set(
        ((data ?? []) as Array<{ article_id: string }>).map(
          (r) => r.article_id,
        ),
      ),
    ];
  }
}

// ── Mappers ────────────────────────────────────────────────────────

function mapAuthor(row: CmsAuthorRow): AuthorResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    image: row.image_url,
    bio: row.bio,
    role: row.role,
    socials: (row.socials as Social[] | null) ?? [],
  };
}

function mapCategory(row: CmsCategoryRow): CategoryResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
  };
}

function mapTag(row: CmsTagRow): TagResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
  };
}

function mapArticle(row: ArticleRowWithJoins): ArticleResponse {
  const authors = (row.article_authors ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((entry) => mapAuthor(entry.author));

  const tags = (row.article_tags ?? []).map((entry) => mapTag(entry.tag));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    content: row.content ?? '',
    featured: row.featured,
    cover_image: row.cover_image_url,
    cover_video: row.cover_video_url,
    published_at: row.published_at ?? row.updated_at,
    updated_at: row.updated_at,
    attribution: (row.attribution as ArticleResponse['attribution']) ?? null,
    authors,
    category: row.category ? mapCategory(row.category) : null,
    tags,
  };
}

function buildPagination({
  limit,
  currentPage,
  totalItems,
}: {
  limit: number;
  currentPage: number;
  totalItems: number;
}): Pagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    limit,
    current_page: currentPage,
    next_page: currentPage < totalPages ? currentPage + 1 : null,
    previous_page: currentPage > 1 ? currentPage - 1 : null,
    total_items: totalItems,
    total_pages: totalPages,
  };
}
