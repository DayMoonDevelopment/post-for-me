import {
  IconArrowRight,
  IconArrowsRepeat,
  IconArrowUpRight,
  IconChart1,
  IconCode,
  IconLineChart1,
  IconNewspaper,
  IconPointChart,
  IconSend,
  IconShield,
  IconTrending1,
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

const analyticsCapabilities = [
  {
    icon: IconChart1,
    title: "Post-level metrics",
    description:
      "Retrieve impressions, reach, engagement, likes, comments, shares, and saves for individual posts. Not account-level, not aggregate.",
  },
  {
    icon: IconCode,
    title: "Unified response format",
    description:
      "Every platform returns metrics in the same structure. No need to normalize 9 different analytics response formats yourself.",
  },
  {
    icon: IconTrending1,
    title: "Track engagement over time",
    description:
      "Fetch analytics for any post at any point after publishing. Build trend views by retrieving metrics repeatedly over days, weeks, or months.",
  },
  {
    icon: IconPointChart,
    title: "Cross-platform comparison",
    description:
      "Compare how the same content performs across different platforms. Consistent metric names and formats make cross-platform analysis straightforward.",
  },
  {
    icon: IconLineChart1,
    title: "Real-time and historical",
    description:
      "Access the latest available metrics for any post. Platforms update at different rates, but Post for Me always returns the freshest data available.",
  },
  {
    icon: IconShield,
    title: "No credentials to start",
    description:
      "Start retrieving post analytics immediately with managed OAuth credentials. Bring your own when you are ready for production.",
  },
];

const useCases = [
  {
    title: "Performance dashboards",
    description:
      "Show users how their posts are performing across platforms. Build engagement views, comparison charts, and trend reports inside your product.",
  },
  {
    title: "Content optimization",
    description:
      "Identify top-performing posts and surface patterns. Help users understand which content types, formats, and platforms drive the most engagement.",
  },
  {
    title: "Reporting and exports",
    description:
      "Pull metrics into reports for stakeholders, clients, or internal review. Consistent data formats make automated reporting straightforward.",
  },
];

const whyNotBuildItYourself = [
  {
    title: "9 different metrics formats",
    description:
      "Every platform names and structures its analytics differently. Impressions on one platform are not the same field on another. Normalizing all of them is tedious, ongoing work.",
    icon: IconCode,
  },
  {
    title: "Constant API changes",
    description:
      "Platforms regularly update their analytics endpoints, deprecate fields, and change rate limits. Each change requires investigation, code updates, and testing.",
    icon: IconArrowsRepeat,
  },
  {
    title: "OAuth and credential overhead",
    description:
      "Accessing post analytics requires authenticated API access to each platform. That means managing developer apps, approval processes, token refresh, and credential storage for every integration.",
    icon: IconShield,
  },
];

const faqs = [
  {
    question: "What analytics data does Post for Me provide?",
    answer:
      "Post-level analytics including impressions, reach, engagement, likes, comments, shares, and saves. All metrics are normalized across platforms into a consistent response format.",
  },
  {
    question: "Is this account-level analytics?",
    answer:
      "No. Post for Me provides analytics at the individual post level, not account-level metrics. You get performance data for specific posts across any connected account.",
  },
  {
    question: "Which platforms support post analytics?",
    answer:
      'All 9 supported platforms: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube. All return metrics in the same unified format. <a href="/integrations">See all platform details</a>.',
  },
  {
    question: "Can I track engagement over time?",
    answer:
      "Yes. Fetch analytics for any post at any point after publishing. Retrieve metrics repeatedly to track how engagement changes over time and build performance trend views in your product.",
  },
  {
    question: "Do I need platform credentials to access analytics?",
    answer:
      'No. Post for Me provides managed OAuth credentials so you can start retrieving analytics immediately. When you are ready for production, you can <a href="/developers">bring your own credentials</a> for full control.',
  },
  {
    question: "How fresh is the analytics data?",
    answer:
      "Post for Me returns the latest available metrics from each platform at the time of your request. The freshness depends on each platform's API update frequency.",
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
                Post Analytics
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-balance">
                Track post performance across every platform
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-balance">
                Retrieve post-level engagement data from 9 social platforms
                through one API. Impressions, reach, likes, comments, shares,
                and saves in a single, consistent format.
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
              Building social media analytics in-house is harder than it looks
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Retrieving and normalizing post metrics across platforms means
              maintaining 9 separate integrations, each with its own response
              format, field names, and auth requirements.
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

      {/* Analytics Feature Surface */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
              Post-level engagement data, unified across platforms
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Post for Me gives you analytics for individual posts across all
              9 platforms. Same metrics, same format, same API.
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
          {analyticsCapabilities.map(({ icon: Icon, title, description }) => (
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

      {/* What Teams Build With Analytics */}
      <div className="bg-muted">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <IconChart1 className="size-5 text-pop" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Use cases
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-balance">
                Turn post metrics into product features
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Analytics data powers dashboards, reports, and optimization
                workflows that your users care about.
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
            Analytics work alongside posting and feeds
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
