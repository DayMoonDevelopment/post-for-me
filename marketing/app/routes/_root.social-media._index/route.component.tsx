import {
  IconArrowsRepeat,
  IconArrowUpRight,
  IconChart1,
  IconCheckmark1,
  IconCode,
  IconNewspaper,
  IconSend,
  IconShield,
} from "@central-icons/outlined";
import { Link } from "react-router";

import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { FAQSection } from "~/components/faq-section";
import { InstagramBrandIcon } from "~/components/instagram-brand-icon";
import { LinkedInBrandIcon } from "~/components/linkedin-brand-icon";
import { PinterestBrandIcon } from "~/components/pinterest-brand-icon";
import { SetupOptionsSection } from "~/components/setup-options-section";
import { ThreadsBrandIcon } from "~/components/threads-brand-icon";
import { TikTokBrandIcon } from "~/components/tiktok-brand-icon";
import { XBrandIcon } from "~/components/x-brand-icon";
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";

import { APP_URL, API_URL } from "~/lib/constants";

import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";

const platformIcons = [
  TikTokBrandIcon, FacebookBrandIcon, InstagramBrandIcon,
  XBrandIcon, LinkedInBrandIcon, PinterestBrandIcon,
  BlueskyBrandIcon, ThreadsBrandIcon, YouTubeBrandIcon,
];

const postingFeatures = [
  "Publish text, images, and video to any platform in one call",
  "Schedule posts for future publishing with timezone handling",
  "Post to multiple platforms simultaneously",
  "Platform-specific formatting applied automatically",
  "Media transcoding and validation handled for you",
  "Real-time webhooks on publish success or failure",
];

const feedsAnalyticsFeatures = [
  "Fetch historical posts from any connected account",
  "Unified post format across all 9 platforms",
  "Post-level impressions, reach, and engagement metrics",
  "Likes, comments, shares, and saves in one response shape",
  "Real-time and historical analytics in the same endpoint",
  "No separate analytics API to integrate",
];

const whyPostForMe = [
  {
    title: "No credentials required to start",
    description:
      "Post for Me provides managed OAuth credentials out of the box. Start building immediately without registering developer apps on each platform. Bring your own credentials when you're ready.",
    icon: IconShield,
  },
  {
    title: "One API, not nine",
    description:
      "Learn one request format and use it everywhere. Posting to TikTok and LinkedIn uses the same endpoint, the same auth model, and the same response shape.",
    icon: IconCode,
  },
  {
    title: "Platform changes absorbed",
    description:
      "When platforms deprecate endpoints or change API versions, we update our integration. Your code stays the same. No emergency patches, no broken deploys.",
    icon: IconArrowsRepeat,
  },
];

const faqs = [
  {
    question: "What social media platforms does Post for Me support?",
    answer:
      "Post for Me supports 9 platforms: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube. All platforms share the same unified API format for posting, feeds, and analytics.",
  },
  {
    question: "Can I schedule social media posts through the API?",
    answer:
      'Yes. Set a <code>publish_at</code> timestamp in your API call and Post for Me handles the rest, including timezone handling and platform-specific scheduling rules.',
  },
  {
    question: "Do I need my own platform API credentials to get started?",
    answer:
      'No. Post for Me provides managed OAuth credentials so you can start building immediately. When you\'re ready for production, you can <a href="/developers">bring your own credentials</a> for full control.',
  },
  {
    question: "What analytics data is available?",
    answer:
      "Post-level analytics including impressions, reach, engagement, likes, comments, shares, and saves. All metrics are normalized across platforms into a consistent response format. This covers post analytics, not account-level analytics.",
  },
  {
    question: "How does the feeds API work?",
    answer:
      'The feeds API fetches historical content that connected accounts have posted. You get posts back in a unified format regardless of which platform they were published on. Useful for content auditing, repurposing, and display. <a href="' +
      API_URL +
      '">See the API docs</a> for the full schema.',
  },
];

export function Component() {
  return (
    <div className="flex flex-col pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Badge variant="outline" className="mb-6">
                Social Media API
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-balance">
                Social media posting and analytics across all major platforms
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-balance">
                Ship social media features in hours, not months. One REST API
                replaces platform-by-platform integration work.
              </p>
              <p className="mt-3 text-base italic text-muted-foreground/80">
                No platform credentials required to get started.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                  <Link to={APP_URL}>
                    Get Started
                    <IconArrowUpRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to={API_URL}>View API Docs</Link>
                </Button>
              </div>
            </div>
            {/* Desktop: 3x3 grid with card containers */}
            <div className="hidden lg:grid grid-cols-3 gap-4 justify-items-center">
              {platformIcons.map((Icon, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center size-20 rounded-xl border bg-card shadow-sm"
                >
                  <Icon className="size-10" />
                </div>
              ))}
            </div>
            {/* Mobile/Tablet: single row, icons only */}
            <div className="flex justify-around lg:hidden col-span-full">
              {platformIcons.map((Icon, i) => (
                <Icon key={i} className="size-6" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Feature Overview */}
      <div className="bg-muted">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-10 md:py-14">
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: IconSend,
                title: "Posting + Scheduling",
                description:
                  "Publish and schedule text, image, and video content to any supported platform. One call, one format, every network.",
              },
              {
                icon: IconNewspaper,
                title: "Feeds",
                description:
                  "Fetch historical posts from connected accounts in a unified format. See what was posted, when, and where across all platforms.",
              },
              {
                icon: IconChart1,
                title: "Post Analytics",
                description:
                  "Track impressions, reach, engagement, and interactions at the post level. Normalized metrics across every platform in one response.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border">
                  <Icon className="size-5 text-pop" />
                </div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posting Section */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
        <div className="flex items-center gap-2 mb-4">
          <IconSend className="size-5 text-pop" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Posting + Scheduling
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
          Publish to every platform in a single call
        </h2>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Post text, images, and video to all 9 platforms through one API
          endpoint. Schedule for later or publish now. Media processing,
          format validation, and platform-specific requirements are handled
          automatically.
        </p>
        <Button asChild className="mt-6 w-fit">
          <Link to={APP_URL}>
            Get Started
            <IconArrowUpRight />
          </Link>
        </Button>
        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {postingFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <IconCheckmark1 className="size-5 text-affirmative shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Feeds + Analytics Section */}
      <div className="bg-muted">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-4">
            <IconNewspaper className="size-5 text-pop" />
            <IconChart1 className="size-5 text-pop" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Feeds + Analytics
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
            See what was posted and how it performed
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Pull historical posts and engagement data from any connected
            account. Feeds and analytics share the same unified format
            across every platform: impressions, reach, likes, comments,
            shares, and saves in one response.
          </p>
          <Button asChild className="mt-6 w-fit">
            <Link to={APP_URL}>
              Get Started
              <IconArrowUpRight />
            </Link>
          </Button>
          <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedsAnalyticsFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <IconCheckmark1 className="size-5 text-affirmative shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Why Teams Use This Section */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
            Skip the platform-by-platform build
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Teams use Post for Me to ship social media features faster and
            maintain less infrastructure. Here&apos;s what changes when you stop
            building integrations from scratch.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {whyPostForMe.map(({ title, description, icon: Icon }) => (
            <div key={title} className="bg-card border rounded-xl p-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted border border-border mb-4">
                <Icon className="size-5 text-pop" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Options */}
      <div className="bg-muted py-6 md:py-14">
        <SetupOptionsSection />
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 pt-4 pb-2 flex justify-center">
          <Button asChild size="lg">
            <Link to={APP_URL}>
              Get Started
              <IconArrowUpRight />
            </Link>
          </Button>
        </div>
      </div>

      {/* FAQ Section */}
      <div>
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <FAQSection
            title="Common questions"
            faqs={faqs}
            link={{ to: API_URL, text: "Read the API docs" }}
          />
        </div>
      </div>

    </div>
  );
}
