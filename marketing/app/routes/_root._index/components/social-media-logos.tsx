import { BlueskyLogo } from "~/components/bluesky-logo";
import { FacebookLogo } from "~/components/facebook-logo";
import { InstagramLogo } from "~/components/instagram-logo";
import { LinkedInLogo } from "~/components/linkedin-logo";
import { TikTokLogo } from "~/components/tiktok-logo";
import { XLogo } from "~/components/x-logo";
import { PinterestLogo } from "~/components/pinterest-logo";
import { ThreadsLogo } from "~/components/threads-logo";
import { YouTubeLogo } from "~/components/youtube-logo";

export const SocialMediaLogos = () => {
  return (
    <div id="platforms" className="flex items-center justify-center px-6 py-24 bg-secondary/25">
      <div>
        <div className="flex flex-wrap items-center justify-center gap-y-12 [&_svg]:h-8 lg:[&_svg]:h-10">
          {[TikTokLogo, YouTubeLogo, LinkedInLogo, PinterestLogo].map(
            (Cmp, i) => (
              <div
                key={i}
                className="w-1/2 sm:w-1/4 flex items-center justify-center px-2 xl:px-8"
              >
                <Cmp />
              </div>
            ),
          )}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-y-12 [&_svg]:h-8 lg:[&_svg]:h-10">
          {[FacebookLogo, InstagramLogo, XLogo, ThreadsLogo, BlueskyLogo].map(
            (Cmp, i) => (
              <div
                key={i}
                className="w-1/3 sm:w-1/5 flex items-center justify-center px-2"
              >
                <Cmp />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
};
