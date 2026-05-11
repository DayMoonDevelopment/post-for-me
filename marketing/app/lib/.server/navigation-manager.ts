import { CMS } from "./cms";
import { getSolutionPreviews } from "./data/solutions.server";

import type { ResourcePreview, SolutionPreview } from "~/components/navigation/types";

/**
 * NavigationManager - Centralized business logic for navigation and footer data
 *
 * This class provides a single source of truth for fetching and organizing
 * navigation-related data across the application.
 */
export class NavigationManager {
  private cms: CMS;

  constructor() {
    this.cms = new CMS();
  }

  /**
   * Fetches featured resources from the cms schema
   * Filters for resources category with social-media-platforms tag
   * Sorts to show featured posts first
   */
  private async getFeaturedResources(): Promise<ResourcePreview[]> {
    const data = await this.cms
      .posts()
      .categories("resources")
      .get();

    const posts = data?.posts || [];

    // Sort posts: featured = true first, then the rest
    const sortedPosts = [...posts].sort((a, b) => {
      if (a.featured === true && b.featured !== true) return -1;
      if (a.featured !== true && b.featured === true) return 1;
      return 0;
    });

    // Map to ResourcePreview format
    return sortedPosts.map((post) => ({
      title: post.title,
      description: post.description,
      href: `/resources/${post.slug}`,
    }));
  }

  /**
   * Fetches solution previews from static data
   */
  private async getSolutions(): Promise<SolutionPreview[]> {
    return getSolutionPreviews();
  }

  /**
   * Gets all navigation data needed for Navigation and Footer components
   *
   * @returns Object containing resources and solutions arrays
   */
  async getNavigationData() {
    const [resources, solutions] = await Promise.all([
      this.getFeaturedResources(),
      this.getSolutions(),
    ]);

    return {
      resources,
      solutions,
    };
  }

  /**
   * Gets navigation data as separate properties for easy destructuring
   * Useful for loaders that need individual arrays
   *
   * @returns Object with featuredResources and solutionPreviews
   */
  async getLoaderData() {
    const { resources, solutions } = await this.getNavigationData();

    return {
      featuredResources: resources,
      solutionPreviews: solutions,
    };
  }
}
