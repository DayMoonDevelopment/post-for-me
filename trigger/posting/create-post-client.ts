import { SupabaseClient } from "@supabase/supabase-js";
import { PostClient } from "./post-client";
import { TwitterPostClient } from "./platforms/twitter-post-client";
import { InstagramPostClient } from "./platforms/instagram-post-client";
import { FacebookPostClient } from "./platforms/facebook-post-client";
import { LinkedInPostClient } from "./platforms/linkedin-post-client";
import { TikTokPostClient } from "./platforms/tiktok-post-client";
import { BlueskyPostClient } from "./platforms/bluesky-post-client";
import { ThreadsPostClient } from "./platforms/threads-post-client";
import { PinterestPostClient } from "./platforms/pinterest-post-client";
import { YouTubePostClient } from "./platforms/youtube-post-client";
import { TikTokBusinessPostClient } from "./platforms/tiktok_business-post-client";
import { PlatformAppCredentials } from "./post.types";

export const createPostClient = ({
  supabaseClient,
  platformName,
  appCredentials,
}: {
  supabaseClient: SupabaseClient;
  platformName: string;
  appCredentials: PlatformAppCredentials;
}): PostClient => {
  switch (platformName) {
    case "x":
      return new TwitterPostClient(supabaseClient, appCredentials);
    case "instagram":
      return new InstagramPostClient(supabaseClient, appCredentials);
    case "facebook":
      return new FacebookPostClient(supabaseClient, appCredentials);
    case "linkedin":
      return new LinkedInPostClient(supabaseClient, appCredentials);
    case "tiktok":
      return new TikTokPostClient(supabaseClient, appCredentials);
    case "bluesky":
      return new BlueskyPostClient(supabaseClient, appCredentials);
    case "threads":
      return new ThreadsPostClient(supabaseClient, appCredentials);
    case "pinterest":
      return new PinterestPostClient(supabaseClient, appCredentials);
    case "youtube":
      return new YouTubePostClient(supabaseClient, appCredentials);
    case "tiktok_business":
      return new TikTokBusinessPostClient(supabaseClient, appCredentials);
    default:
      throw Error("Invalid Platform");
  }
};
