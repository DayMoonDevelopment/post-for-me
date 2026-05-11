export interface Social {
  url: string;
  platform: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  bio: string | null;
  role: string | null;
  socials: Social[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface Attribution {
  author: string;
  url: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  featured: boolean;
  coverImage: string | null;
  coverVideo: string | null;
  publishedAt: Date;
  updatedAt: Date;
  attribution: Attribution | null;
  authors: Author[];
  category: Category;
  tags: Tag[];
}

export interface Pagination {
  limit: number;
  currentPage: number;
  nextPage: number | null;
  previousPage: number | null;
  totalPages: number;
  totalItems: number;
}

export interface PostsListResponse {
  posts: Post[];
  pagination: Pagination;
}

export interface PostResponse {
  post: Post;
}
