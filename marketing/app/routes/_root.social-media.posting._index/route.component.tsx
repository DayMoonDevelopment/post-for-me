import {
  IconArrowRight,
  IconArrowsRepeat,
  IconArrowUpRight,
  IconCalendar1,
  IconCode,
  IconDraft,
  IconImages1,
  IconPreview,
  IconNewspaper,
  IconPeopleAdd,
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

const postingCapabilities = [
  {
    icon: IconTextBlock,
    title: "Captions",
    description:
      "Write once or customize per platform. Captions are validated against each platform's character limits and formatting rules before publishing.",
  },
  {
    icon: IconImages1,
    title: "Media",
    description:
      "Attach images and video to any post. Post for Me validates formats, handles transcoding, and enforces platform-specific size and resolution requirements.",
  },
  {
    icon: IconPreview,
    title: "Thumbnails",
    description:
      "Set custom thumbnails for video posts. Supported on platforms that allow it, ignored gracefully on those that don't.",
  },
  {
    icon: IconCalendar1,
    title: "Scheduled posting",
    description:
      "Set a future publish time and Post for Me delivers the post on schedule. Timezone normalization and platform scheduling rules are handled for you.",
  },
  {
    icon: IconDraft,
    title: "Draft mode",
    description:
      "Create posts without publishing them. Review, edit, and publish later through the API or dashboard. On TikTok, drafts can be sent to the app for manual review.",
  },
  {
    icon: IconPeopleAdd,
    title: "Multi-account posting",
    description:
      "Target multiple connected accounts in a single API call. Each account receives the post with any platform-specific customizations you define.",
  },
];

const platformCustomizations = [
  {
    icon: YouTubeBrandIcon,
    platform: "YouTube",
    detail: "Set a video title in addition to the caption",
  },
  {
    icon: TikTokBrandIcon,
    platform: "TikTok",
    detail: "Send posts to the TikTok app as drafts for manual review and publishing",
  },
  {
    icon: InstagramBrandIcon,
    platform: "Instagram",
    detail: "Post content to the account feed, reels, or story",
  },
  {
    icon: PinterestBrandIcon,
    platform: "Pinterest",
    detail: "Target a specific board for each pin",
  },
  {
    icon: XBrandIcon,
    platform: "X (Twitter)",
    detail: "Create polls with custom options and duration",
  },
  {
    icon: LinkedInBrandIcon,
    platform: "LinkedIn",
    detail: "Post to business pages or personal profiles",
  },
];

const whyNotBuildItYourself = [
  {
    title: "9 different APIs to learn",
    description:
      "Every platform has its own authentication model, request format, media requirements, and rate limits. Building and maintaining 9 integrations is a full-time job.",
    icon: IconCode,
  },
  {
    title: "Constant platform changes",
    description:
      "Platforms deprecate endpoints, change API versions, and update requirements regularly. Each change means engineering time to investigate, update, and test.",
    icon: IconArrowsRepeat,
  },
  {
    title: "Credential management overhead",
    description:
      "Each platform requires its own developer application, approval process, and credential management. Post for Me handles this out of the box or lets you bring your own.",
    icon: IconShield,
  },
];

const faqs = [
  {
    question: "What content types can I post through the API?",
    answer:
      "Text captions, images, and video. Post for Me validates formats, handles transcoding, and enforces platform-specific requirements automatically. You don't need to know each platform's media specs.",
  },
  {
    question: "Can I schedule posts for future publishing?",
    answer:
      'Yes. Include a <code>publish_at</code> timestamp in your API call and Post for Me publishes at the specified time. Timezone normalization and platform-specific scheduling rules are handled for you.',
  },
  {
    question: "Can I customize posts per platform?",
    answer:
      'Yes. Post for Me supports per-platform overrides so you can set YouTube titles, choose Instagram content types, post to specific Pinterest boards, create X polls, and more. All in the same API call. <a href="/integrations">See all platform capabilities</a>.',
  },
  {
    question: "Can I post to multiple accounts at once?",
    answer:
      "Yes. A single API call can target multiple connected accounts across different platforms. Each account receives the post with any platform-specific customizations you define.",
  },
  {
    question: "What is draft mode?",
    answer:
      "Draft mode lets you create posts without publishing them immediately. Drafts can be reviewed, edited, and published later through the API or dashboard. On TikTok, drafts can be sent to the TikTok app for manual review and publishing.",
  },
  {
    question: "How does media handling work?",
    answer:
      "Upload images or video with your post and Post for Me takes care of the rest. Format validation, transcoding, resolution enforcement, and platform-specific requirements are all handled automatically.",
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
                Social Media Posting
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-balance">
                Post to every major social media platform through one API
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-balance">
                Post text, images, and video to 9 platforms in a single call.
                Schedule for later, save as draft, or publish now. Media
                processing and platform-specific formatting handled for you.
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
              Developing posting infrastructure in-house is more work than it looks
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Cross-platform posting means maintaining 9 separate integrations,
              each with its own auth, media rules, and API quirks.
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

      {/* Posting Feature Surface */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
              Everything you need to build posting into your product
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Post for Me gives you a complete posting system out of the box.
              Captions, media, scheduling, drafts, and multi-account delivery
              all work through the same API.
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
          {postingCapabilities.map(({ icon: Icon, title, description }) => (
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

      {/* How Posting Works + Platform Customizations */}
      <div className="bg-muted">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <IconSend className="size-5 text-pop" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  How it works
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
                One request, every platform, full control
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Define your content once: caption, media, and publish settings. Post
                for Me normalizes your request for each target platform, handles media
                processing, and delivers the post. Every platform has unique features,
                and you can take advantage of them with per-platform overrides in the
                same API call.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0 w-fit">
              <Link to={APP_URL}>
                Get Started
                <IconArrowUpRight />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformCustomizations.map(({ icon: Icon, platform, detail }) => (
              <div
                key={platform}
                className="flex items-start gap-4 bg-card border rounded-xl p-5"
              >
                <div className="flex items-center justify-center size-10 shrink-0 rounded-lg bg-muted border border-border">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{platform}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="w-fit">
              <Link to="/integrations">
                See all platform options
                <IconArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Related Capabilities */}
      <div>
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance text-center mb-10">
            Posting is just the start
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <Link
              to="/social-media/feeds"
              className="flex items-start gap-4 bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-muted border border-border">
                <IconNewspaper className="size-5 text-pop" />
              </div>
              <div>
                <h3 className="font-semibold">Feeds</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pull published posts from any connected account in a unified
                  format. See what was published, when, and where.
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
                <IconNewspaper className="size-5 text-pop" />
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
      <div className="bg-muted">
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
