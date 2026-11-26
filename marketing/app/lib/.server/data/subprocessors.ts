export interface Subprocessor {
  name: string;
  website: string;
  purpose: string;
  data: string;
  /**
   * Where the vendor stores or processes Post for Me user data.
   * `null` means the region has not been confirmed against the vendor's
   * production configuration yet; the page renders it as "To be confirmed".
   */
  location: string | null;
}

export interface SubprocessorGroup {
  title: string;
  description: string;
  subprocessors: Subprocessor[];
}

export const SUBPROCESSORS_LAST_UPDATED = "November 26, 2026";

export const SUBPROCESSOR_GROUPS: SubprocessorGroup[] = [
  {
    title: "Infrastructure and hosting",
    description:
      "Vendors that host the Post for Me API, dashboard, database, background jobs, and media files.",
    subprocessors: [
      {
        name: "Supabase",
        website: "https://supabase.com",
        purpose: "Primary database, dashboard authentication, media storage",
        data: "Account email, team and project records, connected social account handles and OAuth tokens, post content, uploaded media",
        // TODO(subprocessors): confirm the production Supabase project region.
        location: null,
      },
      {
        name: "Unkey",
        website: "https://unkey.com",
        purpose:
          "API key issuance and verification; application hosting for the API, dashboard, and website",
        data: "API key metadata, request metadata (IP address, timestamps), API requests and responses in transit",
        // TODO(subprocessors): confirm the Unkey Deploy regions for the
        // post-for-me-api, dashboard, and marketing apps. Zenith's apps run in
        // us-east-1 (post-for-me-zenith/deploy/*.yml).
        location: null,
      },
      {
        name: "Trigger.dev",
        website: "https://trigger.dev",
        purpose:
          "Background jobs: publishing posts, scheduled posts, media processing, webhooks",
        data: "Post content, media URLs, social account OAuth tokens while a job runs, job payloads and logs",
        // TODO(subprocessors): confirm the Trigger.dev Cloud project region.
        location: null,
      },
      {
        name: "Cloudflare (R2)",
        website: "https://www.cloudflare.com",
        purpose: "Media file storage and delivery",
        data: "Uploaded and processed media files",
        // TODO(subprocessors): confirm the R2 bucket location hint or jurisdiction.
        location: null,
      },
      {
        name: "RunPod",
        website: "https://www.runpod.io",
        purpose: "GPU media processing (video and image transcoding)",
        data: "Uploaded media files, held temporarily while processing",
        location: "Canada (Montréal)",
      },
      {
        name: "PlanetScale",
        website: "https://planetscale.com",
        purpose: "Media processing job database",
        data: "Media job records (media URLs, team and project identifiers)",
        // TODO(subprocessors): confirm the PlanetScale database region.
        location: null,
      },
      {
        name: "Upstash",
        website: "https://upstash.com",
        purpose: "Media processing job queue (Redis)",
        data: "Queued job payloads (media URLs, team and project identifiers)",
        // TODO(subprocessors): confirm Upstash is the production Redis
        // provider for MEDIA_SERVER_REDIS_URL / REDIS_URL, and its region.
        location: null,
      },
      {
        name: "Vercel",
        website: "https://vercel.com",
        purpose: "Standby hosting for the dashboard and website",
        data: "Dashboard requests and responses in transit, request metadata (IP address, timestamps)",
        // TODO(subprocessors): confirm the Vercel function region.
        location: null,
      },
    ],
  },
  {
    title: "Monitoring",
    description: "Vendors that receive errors, logs, and traces from our services.",
    subprocessors: [
      {
        name: "Sentry",
        website: "https://sentry.io",
        purpose: "API error monitoring",
        data: "Error reports, which can include request metadata and identifiers",
        // TODO(subprocessors): confirm US or EU (de.sentry.io) from the DSN host.
        location: null,
      },
      {
        name: "Axiom",
        website: "https://axiom.co",
        purpose: "Logs and traces for media processing",
        data: "Service logs and traces, which can include media URLs and identifiers",
        // TODO(subprocessors): confirm the Axiom organization region.
        location: null,
      },
    ],
  },
  {
    title: "Business operations",
    description:
      "Vendors that handle billing, email, support, analytics, and advertising measurement.",
    subprocessors: [
      {
        name: "Stripe",
        website: "https://stripe.com",
        purpose: "Payments, subscriptions, usage-based billing",
        data: "Billing email, name, payment details (card data never reaches Post for Me), usage counts",
        location: "United States",
      },
      {
        name: "Loops",
        website: "https://loops.so",
        purpose: "Sign-in, invite, and transactional email",
        data: "Email address, name, team name",
        location: "United States",
      },
      {
        name: "PostHog",
        website: "https://posthog.com",
        purpose: "Product analytics",
        data: "Email address, name, team and project identifiers, page views and product events, IP address",
        location: "United States",
      },
      {
        name: "Crisp",
        website: "https://crisp.chat",
        purpose: "Support chat",
        data: "Chat messages, email address if provided, browser metadata",
        // TODO(subprocessors): confirm Crisp's hosting region.
        location: null,
      },
      {
        name: "Google (Google Ads)",
        website: "https://ads.google.com",
        purpose: "Advertising conversion measurement",
        data: "Page views, click identifiers, conversion events, email and name for conversion matching",
        location: "United States",
      },
      {
        name: "Meta (Meta Pixel)",
        website: "https://www.facebook.com/business",
        purpose: "Advertising conversion measurement",
        data: "Page views, click identifiers, conversion events, email and name for conversion matching",
        location: "United States",
      },
    ],
  },
];
