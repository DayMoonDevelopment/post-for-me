export type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  description: string;
  coverImage: string;
  publishedAt: Date;
  updatedAt: Date;
  authors: {
    id: string;
    name: string;
    image: string;
  }[];
  category: Omit<Category, "count">;
  tags: Omit<Tag, "count">[];
  attribution: {
    author: string;
    url: string;
  } | null;
  featured: boolean;
};

export type Pagination = {
  limit: number;
  currentPage: number;
  nextPage: number | null;
  previousPage: number | null;
  totalItems: number;
  totalPages: number;
};

export type MarblePostListResponse = {
  posts: Post[];
  pagination: Pagination;
};

export type MarblePostResponse = {
  post: Post;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  count: {
    posts: number;
  };
};
export type MarbleTagResponse = {
  tag: Tag;
};

export type MarbleTagListResponse = {
  tags: Tag[];
  pagination: Pagination;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  count: {
    posts: number;
  };
};

export type MarbleCategoryResponse = {
  category: Category;
};

export type MarbleCategoryListResponse = {
  categories: Category[];
  pagination: Pagination;
};

export type Author = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  bio: string | null;
  role: string | null;
  socials: Social[];
};

export type Social = {
  url: string;
  platform: SocialPlatform;
};

export type SocialPlatform =
  | "x"
  | "github"
  | "facebook"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "website"
  | "onlyfans"
  | "discord"
  | "bluesky";

export type MarbleAuthorResponse = {
  author: Author;
};

export type MarbleAuthorListResponse = {
  authors: Author[];
  pagination: Pagination;
};
