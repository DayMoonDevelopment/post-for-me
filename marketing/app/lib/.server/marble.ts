import type {
  MarbleAuthorListResponse,
  MarbleCategoryListResponse,
  MarblePostListResponse,
  MarblePostResponse,
  MarbleTagListResponse,
  MarbleTagResponse,
} from "./marble.types";

export class MarbleCMS {
  private url: string;
  private key: string;

  constructor() {
    this.url = process.env.MARBLE_API_URL!;
    this.key = process.env.MARBLE_WORKSPACE_KEY!;
  }

  async getPosts(): Promise<MarblePostListResponse | undefined> {
    try {
      const raw = await fetch(`${this.url}/${this.key}/posts`);
      const data: MarblePostListResponse = await raw.json();
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  async getTags(): Promise<MarbleTagListResponse | undefined> {
    try {
      const raw = await fetch(`${this.url}/${this.key}/tags`);
      const data: MarbleTagListResponse = await raw.json();
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  async getSinglePost(slug: string): Promise<MarblePostResponse | undefined> {
    try {
      const raw = await fetch(`${this.url}/${this.key}/posts/${slug}`);
      const data: MarblePostResponse = await raw.json();
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  async getCategories(): Promise<MarbleCategoryListResponse | undefined> {
    try {
      const raw = await fetch(`${this.url}/${this.key}/categories`);
      const data: MarbleCategoryListResponse = await raw.json();
      console.log(data);

      return data;
    } catch (error) {
      console.log(error);
    }
  }

  async getAuthors(): Promise<MarbleAuthorListResponse | undefined> {
    try {
      const raw = await fetch(`${this.url}/${this.key}/authors`);
      const data: MarbleAuthorListResponse = await raw.json();
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  async getPostsByTag(tagSlug: string, categorySlug: string = "resources"): Promise<MarblePostListResponse | undefined> {
    try {
      const postsResponse = await this.getPosts();
      if (!postsResponse?.posts) return undefined;

      const filteredPosts = postsResponse.posts.filter(post =>
        post.category.slug === categorySlug &&
        post.tags.some(tag => tag.slug === tagSlug)
      );

      return {
        posts: filteredPosts,
        pagination: {
          ...postsResponse.pagination,
          totalItems: filteredPosts.length,
          totalPages: Math.ceil(filteredPosts.length / postsResponse.pagination.limit)
        }
      };
    } catch (error) {
      console.log(error);
    }
  }

  async getPostByCategoryTagAndSlug(categorySlug: string, tagSlug: string, postSlug: string): Promise<MarblePostResponse | undefined> {
    try {
      const postsResponse = await this.getPosts();
      if (!postsResponse?.posts) return undefined;

      const post = postsResponse.posts.find(p =>
        p.category.slug === categorySlug &&
        p.tags.some(tag => tag.slug === tagSlug) &&
        p.slug === postSlug
      );

      return post ? { post } : undefined;
    } catch (error) {
      console.log(error);
    }
  }

  async getTagBySlug(tagSlug: string): Promise<MarbleTagResponse | undefined> {
    try {
      const tagsResponse = await this.getTags();
      if (!tagsResponse?.tags) return undefined;

      const tag = tagsResponse.tags.find(t => t.slug === tagSlug);
      return tag ? { tag } : undefined;
    } catch (error) {
      console.log(error);
    }
  }
}
