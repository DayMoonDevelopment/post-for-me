import {
  IconArrowRight,
  IconArrowsRepeat,
  IconArrowUpRight,
  IconChart1,
  IconCode,
  IconHistory,
  IconImages1,
  IconNewspaper,
  IconSend,
  IconShield,
  IconTextBlock,
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

const feedCapabilities = [
  {
    icon: IconHistory,
    title: "Post retrieval",
    description:
      "Fetch previously published posts from any connected account. Access captions, media, timestamps, and metadata going as far back as each platform allows.",
  },
  {
    icon: IconTextBlock,
    title: "Unified post format",
    description:
      "Every post comes back in the same structure regardless of platform. No need to normalize responses from 9 different APIs yourself.",
  },
  {
    icon: IconImages1,
    title: "Media URLs included",
    description:
      "Each post includes direct URLs to images and video so you can render content in your own UI without additional API calls.",
  },
  {
    icon: IconNewspaper,
    title: "Multi-account feeds",
    description:
      "Pull feeds from multiple connected accounts across different platforms. Aggregate content from all of a user's social profiles in one place.",
  },
  {
    icon: IconCode,
    title: "Structured metadata",
    description:
      "Every post includes platform, post type, publish date, and engagement data in a consistent schema you can build against reliably.",
  },
  {
    icon: IconShield,
    title: "No credentials to start",
    description:
      "Start reading feeds immediately with managed OAuth credentials. Bring your own when you're ready for production.",
  },
];

const useCases = [
  {
    title: "Content display",
    description:
      "Show a user's social media posts inside your product. Build social feeds, portfolio views, or content galleries from connected accounts.",
  },
  {
    title: "Content auditing",
    description:
      "Let teams review what was posted across platforms. Surface published content for compliance, brand consistency, or campaign review.",
  },
  {
    title: "Content repurposing",
    description:
      "Fetch existing posts and use them as inputs for new workflows. Identify top-performing content, recycle captions, or repost to new platforms.",
  },
];

const whyNotBuildItYourself = [
  {
    title: "9 different response formats",
    description:
      "Every platform returns posts in its own structure with different field names, media formats, and pagination models. Normalizing all of them is a significant engineering effort.",
    icon: IconCode,
  },
  {
    title: "Constant API changes",
    description:
      "Platforms regularly change their feed endpoints, deprecate fields, and update rate limits. Each change requires investigation, code updates, and testing.",
    icon: IconArrowsRepeat,
  },
  {
    title: "OAuth and credential overhead",
    description:
      "Reading feeds requires authenticated access to each platform. That means managing developer apps, approval processes, token refresh, and credential storage for every integration.",
    icon: IconShield,
  },
];

const faqs = [
  {
    question: "What does the feeds API return?",
    answer:
      "Posts from connected social media accounts. Each post includes the caption, media URLs, publish date, platform, and post type in a unified format across all 9 supported platforms.",
  },
  {
    question: "Which platforms support feed reading?",
    answer:
      'All 9 supported platforms: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube. All return posts in the same unified format. <a href="/integrations">See all platform details</a>.',
  },
  {
    question: "Can I display feed content in my own product?",
    answer:
      "Yes. The feeds API is designed for exactly this. Fetch posts from connected accounts and render them in your own UI, dashboard, or internal tool. You get structured data including captions, media, timestamps, and metadata.",
  },
  {
    question: "Do I need platform credentials to read feeds?",
    answer:
      'No. Post for Me provides managed OAuth credentials so you can start reading feeds immediately. When you\'re ready for production, you can <a href="/developers">bring your own credentials</a> for full control.',
  },
  {
    question: "How far back can I fetch posts?",
    answer:
      "The depth of available content depends on each platform's API limitations. Post for Me fetches as far back as each platform allows and returns everything in a consistent format.",
  },
  {
    question: "Is feed data available in real time?",
    answer:
      "Feeds return the latest available content from each platform. The freshness depends on each platform's API, but Post for Me always fetches the most recent data available at the time of your request.",
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
              <Badge variant="pop" className="mb-6">
                Social Media Feeds
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-balance">
                Pull posts from every connected account
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-balance">
                Fetch published content from 9 social platforms through one
                API. Display user posts in your own product without building
                platform-specific read integrations.
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

      {/* Why Not Build It Yourself */}
      <div className="bg-muted">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
              Building social media integrations in-house is harder than it looks
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Reading and normalizing social content across platforms means
              maintaining 9 separate integrations, each with its own response
              format, pagination model, and auth requirements.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {whyNotBuildItYourself.map(({ title, description, icon: Icon }) => (
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
      </div>

      {/* Feed Feature Surface */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
              Read social content from any connected account
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Post for Me gives you read access to published posts across all
              9 platforms. Captions, media, timestamps, and metadata returned
              in one consistent format.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 w-fit">
            <Link to={APP_URL}>
              Get Started
              <IconArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedCapabilities.map(({ icon: Icon, title, description }) => (
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

      {/* What Teams Build With Feeds */}
      <div className="bg-muted">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <IconNewspaper className="size-5 text-pop" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Use cases
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
                Put published social content to work in your product
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Feeds give your product access to what users have already
                published. That content can power features your users actually
                care about.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0 w-fit">
              <Link to={APP_URL}>
                Get Started
                <IconArrowUpRight />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            {useCases.map(({ title, description }) => (
              <div key={title} className="bg-card border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Capabilities */}
      <div>
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance text-center mb-10">
            Feeds work alongside posting and analytics
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <Link
              to="/social-media/posting"
              className="flex items-start gap-4 bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-muted border border-border">
                <IconSend className="size-5 text-pop" />
              </div>
              <div>
                <h3 className="font-semibold">Posting</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Publish text, images, and video to all 9 platforms in a
                  single call. Schedule, draft, and customize per platform.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Learn more <IconArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
            <Link
              to="/social-media/analytics"
              className="flex items-start gap-4 bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-muted border border-border">
                <IconChart1 className="size-5 text-pop" />
              </div>
              <div>
                <h3 className="font-semibold">Post Analytics</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Track impressions, reach, likes, comments, shares, and saves
                  at the post level. Same format, every platform.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Learn more <IconArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          </div>
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
