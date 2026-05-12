import { IconGlobe, IconGithub } from "@central-icons/outlined";

import { parseSocialLink } from "~/lib/social-links";

import { BlueskyBrandIcon } from "./bluesky-brand-icon";
import { FacebookBrandIcon } from "./facebook-brand-icon";
import { InstagramBrandIcon } from "./instagram-brand-icon";
import { LinkedInBrandIcon } from "./linkedin-brand-icon";
import { PinterestBrandIcon } from "./pinterest-brand-icon";
import { ThreadsBrandIcon } from "./threads-brand-icon";
import { TikTokBrandIcon } from "./tiktok-brand-icon";
import { XBrandIcon } from "./x-brand-icon";
import { YouTubeBrandIcon } from "./youtube-brand-icon";

interface AuthorCardProps {
  author: {
    name: string;
    image: string | null;
    bio: string | null;
    role: string | null;
    socials: Array<{ url: string; platform: string }>;
  };
}

function getSocialIcon(platform: string, className: string = "w-5 h-5") {
  switch (platform) {
    case "x":
    case "twitter":
      return <XBrandIcon className={className} />;
    case "linkedin":
      return <LinkedInBrandIcon className={className} />;
    case "github":
      return <IconGithub className={className} />;
    case "facebook":
      return <FacebookBrandIcon className={className} />;
    case "instagram":
      return <InstagramBrandIcon className={className} />;
    case "youtube":
      return <YouTubeBrandIcon className={className} />;
    case "tiktok":
      return <TikTokBrandIcon className={className} />;
    case "pinterest":
      return <PinterestBrandIcon className={className} />;
    case "bluesky":
      return <BlueskyBrandIcon className={className} />;
    case "threads":
      return <ThreadsBrandIcon className={className} />;
    default:
      return <IconGlobe className={className} />;
  }
}

export function AuthorCard({ author }: AuthorCardProps) {
  if (!author) return null;

  const parsedSocials = author.socials.map((social) =>
    parseSocialLink(social.url, social.platform)
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-6 border rounded-lg bg-muted/30">
      {/* Author Image */}
      {author.image ? (
        <div className="flex-shrink-0">
          <img
            src={author.image}
            alt={author.name}
            className="w-20 h-20 rounded-full object-cover"
          />
        </div>
      ) : null}

      {/* Author Info */}
      <div className="flex-1 min-w-0">
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{author.name}</h3>
          {author.role ? (
            <p className="text-sm text-muted-foreground">{author.role}</p>
          ) : null}
        </div>

        {author.bio ? (
          <p className="text-sm text-muted-foreground mb-3">{author.bio}</p>
        ) : null}

        {/* Social Links */}
        {parsedSocials.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {parsedSocials.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                aria-label={`${author.name} on ${social.displayName}`}
              >
                {getSocialIcon(social.platform, "w-4 h-4")}
                <span className="hidden sm:inline">{social.displayName}</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
