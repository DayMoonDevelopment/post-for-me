export type ArticleStatus = 'draft' | 'published' | 'archived';
export type ContentFormat = 'html' | 'markdown';

export interface CmsAuthorRow {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  bio: string | null;
  role: string | null;
  socials: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CmsCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CmsTagRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CmsArticleRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  content_format: ContentFormat;
  cover_image_url: string | null;
  featured: boolean;
  status: ArticleStatus;
  attribution: unknown;
  category_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CmsArticleAuthorRow {
  article_id: string;
  author_id: string;
  position: number;
}

export interface CmsArticleTagRow {
  article_id: string;
  tag_id: string;
}

export interface Social {
  url: string;
  platform: string;
}

export interface AuthorResponse {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  bio: string | null;
  role: string | null;
  socials: Social[];
}

export interface CategoryResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface TagResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface Attribution {
  author: string;
  url: string;
}

export interface ArticleResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  featured: boolean;
  cover_image: string | null;
  published_at: string;
  updated_at: string;
  attribution: Attribution | null;
  authors: AuthorResponse[];
  category: CategoryResponse | null;
  tags: TagResponse[];
}

export interface Pagination {
  limit: number;
  current_page: number;
  next_page: number | null;
  previous_page: number | null;
  total_items: number;
  total_pages: number;
}

export interface ArticlesListResponse {
  data: ArticleResponse[];
  pagination: Pagination;
}

export interface ArticleSingleResponse {
  data: ArticleResponse;
}

export interface AuthorsListResponse {
  data: AuthorResponse[];
}

export interface CategoriesListResponse {
  data: CategoryResponse[];
}

export interface TagsListResponse {
  data: TagResponse[];
}
