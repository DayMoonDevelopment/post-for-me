import {
  BlueskyIcon,
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  ThreadsIcon,
  TikTokIcon,
  XIcon,
  TriangleExclamationIcon,
} from "icons";

import { YouTubeImageIcon } from "~/components/youtube-icon";

import { cn } from "~/lib/utils";

const brandIconMap = {
  bluesky: BlueskyIcon,
  facebook: FacebookIcon,
  google: GoogleIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  pinterest: PinterestIcon,
  threads: ThreadsIcon,
  tiktok: TikTokIcon,
  x: XIcon,
  twitter: XIcon, // Alias for X
  youtube: YouTubeImageIcon,
} as const;

interface BrandIconProps {
  brand: keyof typeof brandIconMap | string;
  className?: string;
}
export function BrandIcon({ brand, className }: BrandIconProps) {
  const IconComponent =
    brandIconMap[brand.toLowerCase() as keyof typeof brandIconMap];

  if (!IconComponent) {
    // Fallback for unknown brands
    return <TriangleExclamationIcon className={className} />;
  }

  return <IconComponent className={cn(className)} />;
}
