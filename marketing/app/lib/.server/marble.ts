import type {
  MarbleAuthorListResponse,
  MarbleCategoryListResponse,
  MarblePostListResponse,
  MarblePostResponse,
  MarbleTagListResponse,
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
}
