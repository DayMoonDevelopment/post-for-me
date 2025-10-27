import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";
import { MetadataComposer } from "~/lib/meta";

/**
 * Base meta for all resources pages.
 * Provides site-wide defaults only - individual routes handle their own complete metadata.
 */
export const meta: Route.MetaFunction = () => {
  const metadata = new MetadataComposer();

  metadata.keywords = "social media API, posting API, scheduling API, developer social API, TikTok API, Instagram API, Facebook API, X API, LinkedIn API";

  return metadata.build();
};
