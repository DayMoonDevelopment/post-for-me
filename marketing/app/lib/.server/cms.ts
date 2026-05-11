import type {
  Author,
  Category,
  Pagination,
  Post,
  PostResponse,
  PostsListResponse,
  Tag,
} from "./cms-types";

/**
 * CMS client — reads from the Post for Me API's private namespace.
 *
 * The private namespace requires a bearer token granted the `cms.read`
 * permission in Unkey. It is NOT exposed in the public OpenAPI spec.
 */

const API_BASE_URL =
  process.env.POST_FOR_ME_API_URL ?? "https://api.postforme.dev";

const API_KEY = process.env.POST_FOR_ME_API_KEY;

export class CMS {
  posts(): PostsQueryBuilder {
    return new PostsQueryBuilder();
  }

  post(identifier: string): SinglePostQuery {
    return new SinglePostQuery(identifier);
  }
}

interface ArticleQueryOpts {
  limitValue?: number | "all";
  pageValue?: number;
  orderValue?: "asc" | "desc";
  categorySlugs?: string[];
  excludeCategorySlugs?: string[];
  tagSlugs?: string[];
  excludeTagSlugs?: string[];
  query?: string;
  featured?: boolean;
}

export class PostsQueryBuilder {
  private opts: ArticleQueryOpts = {};

  limit(value: number | "all"): this {
    this.opts.limitValue = value;
    return this;
  }

  page(value: number): this {
    this.opts.pageValue = value;
    return this;
  }

  order(value: "asc" | "desc"): this {
    this.opts.orderValue = value;
    return this;
  }

  categories(...slugs: string[]): this {
    if (slugs.length) this.opts.categorySlugs = slugs;
    return this;
  }

  excludeCategories(...slugs: string[]): this {
    if (slugs.length) this.opts.excludeCategorySlugs = slugs;
    return this;
  }

  tags(...slugs: string[]): this {
    if (slugs.length) this.opts.tagSlugs = slugs;
    return this;
  }

  excludeTags(...slugs: string[]): this {
    if (slugs.length) this.opts.excludeTagSlugs = slugs;
    return this;
  }

  search(query: string): this {
    if (query.trim()) this.opts.query = query.trim();
    return this;
  }

  featured(value: boolean): this {
    this.opts.featured = value;
    return this;
  }

  async get(): Promise<PostsListResponse | undefined> {
    const pageSize =
      this.opts.limitValue === "all"
        ? 100
        : typeof this.opts.limitValue === "number"
          ? this.opts.limitValue
          : 10;

    const fetchAll = this.opts.limitValue === "all";
    const startPage = this.opts.pageValue ?? 1;

    try {
      const all: Post[] = [];
      let page = startPage;
      let totalItems = 0;
      let response: ApiArticlesList | undefined;

      while (true) {
        response = await fetchArticles({
          limit: pageSize,
          page,
          order: this.opts.orderValue ?? "desc",
          category: this.opts.categorySlugs,
          exclude_category: this.opts.excludeCategorySlugs,
          tag: this.opts.tagSlugs,
          exclude_tag: this.opts.excludeTagSlugs,
          q: this.opts.query,
          featured: this.opts.featured,
        });

        if (!response) return undefined;

        totalItems = response.pagination.total_items;
        all.push(...response.data.map(mapArticle));

        if (!fetchAll || response.data.length < pageSize) break;
        page += 1;
      }

      const pagination = buildPagination({
        pageSize,
        currentPage: fetchAll ? 1 : startPage,
        totalItems: fetchAll ? all.length : totalItems,
      });

      return { posts: all, pagination };
    } catch (error) {
      console.error("CMS.posts fetch error", error);
      return undefined;
    }
  }
}

export class SinglePostQuery {
  constructor(private readonly identifier: string) {}

  async get(): Promise<PostResponse | undefined> {
    try {
      const response = await apiGet<ApiArticleSingle>(
        `/private/cms/articles/${encodeURIComponent(this.identifier)}`,
      );

      if (!response) return undefined;

      return { post: mapArticle(response.data) };
    } catch (error) {
      if (error instanceof CmsNotFoundError) return undefined;
      console.error("CMS.post fetch error", error);
      return undefined;
    }
  }
}

// ── API types ──────────────────────────────────────────────────────

interface ApiAuthor {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  bio: string | null;
  role: string | null;
  socials: Author["socials"];
}

interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface ApiTag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface ApiArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  featured: boolean;
  cover_image: string | null;
  cover_video: string | null;
  published_at: string;
  updated_at: string;
  attribution: Post["attribution"];
  authors: ApiAuthor[];
  category: ApiCategory | null;
  tags: ApiTag[];
}

interface ApiPagination {
  limit: number;
  current_page: number;
  next_page: number | null;
  previous_page: number | null;
  total_items: number;
  total_pages: number;
}

interface ApiArticlesList {
  data: ApiArticle[];
  pagination: ApiPagination;
}

interface ApiArticleSingle {
  data: ApiArticle;
}

// ── Mappers ────────────────────────────────────────────────────────

function mapArticle(article: ApiArticle): Post {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    description: article.description,
    content: article.content,
    featured: article.featured,
    coverImage: article.cover_image,
    coverVideo: article.cover_video,
    publishedAt: new Date(article.published_at),
    updatedAt: new Date(article.updated_at),
    attribution: article.attribution,
    authors: article.authors as Author[],
    category: mapCategory(article.category),
    tags: article.tags as Tag[],
  };
}

function mapCategory(category: ApiCategory | null): Category {
  if (!category) {
    return { id: "", slug: "", name: "", description: null };
  }
  return category;
}

function buildPagination({
  pageSize,
  currentPage,
  totalItems,
}: {
  pageSize: number;
  currentPage: number;
  totalItems: number;
}): Pagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    limit: pageSize,
    currentPage,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    previousPage: currentPage > 1 ? currentPage - 1 : null,
    totalItems,
    totalPages,
  };
}

// ── HTTP ───────────────────────────────────────────────────────────

class CmsNotFoundError extends Error {}

interface FetchArticlesParams {
  limit: number;
  page: number;
  order: "asc" | "desc";
  category?: string[];
  exclude_category?: string[];
  tag?: string[];
  exclude_tag?: string[];
  q?: string;
  featured?: boolean;
}

async function fetchArticles(
  params: FetchArticlesParams,
): Promise<ApiArticlesList | undefined> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit));
  search.set("page", String(params.page));
  search.set("order", params.order);

  if (params.category?.length) search.set("category", params.category.join(","));
  if (params.exclude_category?.length) {
    search.set("exclude_category", params.exclude_category.join(","));
  }
  if (params.tag?.length) search.set("tag", params.tag.join(","));
  if (params.exclude_tag?.length) {
    search.set("exclude_tag", params.exclude_tag.join(","));
  }
  if (params.q) search.set("q", params.q);
  if (typeof params.featured === "boolean") {
    search.set("featured", String(params.featured));
  }

  return apiGet<ApiArticlesList>(`/private/cms/articles?${search.toString()}`);
}

async function apiGet<T>(path: string): Promise<T | undefined> {
  if (!API_KEY) {
    throw new Error(
      "POST_FOR_ME_API_KEY is not defined — set it to a key with the `cms.read` permission",
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    throw new CmsNotFoundError();
  }

  if (!response.ok) {
    throw new Error(
      `CMS request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}
