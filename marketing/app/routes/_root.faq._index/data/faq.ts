import type { FAQType } from "~/lib/global.types";

export const faq: { title: string; faq: FAQType[] }[] = [
  {
    title: "General Questions",
    faq: [
      {
        q: "What is Post for Me?",
        a: "Post for Me is a unified API platform that simplifies social media integrations for developers, enabling posting, scheduling, media processing, OAuth, feed reading, and post metrics across 9 platforms: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.",
      },
      {
        q: "Who is Post for Me designed for?",
        a: "It’s built for teams creating marketing workflows, AI content generation tools, mobile games, social media scheduling apps, and B2B SaaS products needing seamless social media integrations.",
      },
      {
        q: "How does Post for Me compare to other social media APIs?",
        a: "Unlike competitors, we offer a single API for 9 platforms, no arbitrary rate limits (only platform-enforced ones), no account caps, and pricing based on your actual posting volume.",
      },
      {
        q: "Why should I choose Post for Me over direct platform APIs?",
        a: "We handle OAuth, token refresh, media processing, and platform-specific quirks, reducing integration time by weeks while giving you full access to each platform’s features.",
      },
      {
        q: "How long has Post for Me been available?",
        a: "Launched by Day Moon Development, we’ve been helping developers integrate social media since [year TBD – please confirm].",
      },
    ],
  },
  {
    title: "Pricing and Plans",
    faq: [
      {
        q: "What are the pricing plans for Post for Me?",
        a: "We offer tiered pricing to give you a predictable, fixed cost that scales with your usage, starting at $5/month for 500 total posts.",
      },
      {
        q: "Will I get shut down if I go over my plan’s post limit?",
        a: "No, we won’t shut down your service or auto-upgrade your plan. If you consistently exceed your post limit, we’ll contact you at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) to discuss increasing your plan limits.",
      },
      {
        q: "Do you offer discounts for non-profits?",
        a: "Yes, non-profits can contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for potential discounts.",
      },
      {
        q: "What is enterprise pricing?",
        a: "For volumes above 300,000 posts/month, contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for custom pricing and dedicated support.",
      },
      {
        q: "Are there any hidden fees?",
        a: "No, our pricing is transparent and based solely on your posting volume. No additional fees apply.",
      },
      {
        q: "How do I upgrade my plan?",
        a: "Log into the admin dashboard at [postforme.dev](https://www.postforme.dev) and select a higher tier under billing settings.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept major credit cards and secure payments via our billing provider [TBD – please confirm].",
      },
    ],
  },
  {
    title: "Security and Data Management",
    faq: [
      {
        q: "How does Post for Me handle user data security?",
        a: "We store OAuth access tokens securely in our database, leveraging the security of providers like Supabase, Render, Trigger, and Vercel. We don’t store social media usernames or passwords.",
      },
      {
        q: "Can users disconnect their social media accounts?",
        a: "Yes, users can disconnect their accounts at any time via your app or our API, revoking access instantly.",
      },
      {
        q: "How do I delete my data?",
        a: "Use our API to delete user data at any time. We ensure secure deletion from our database upon request.",
      },
      {
        q: "Is Post for Me compliant with data regulations?",
        a: "Our providers ensure robust security, but specific compliance (e.g., GDPR, CCPA) depends on your implementation. Contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for guidance.",
      },
      {
        q: "How are OAuth tokens managed?",
        a: "We handle OAuth token storage, refresh, and revocation securely, so you don’t need to manage platform-specific token lifecycles.",
      },
    ],
  },
  {
    title: "Integrations and APIs",
    faq: [
      {
        q: "Which platforms does Post for Me support?",
        a: "TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.",
      },
      {
        q: "Can I use my own social media developer credentials?",
        a: "Yes, you can bring your own credentials or use ours to connect user accounts to your app.",
      },
      {
        q: "What SDKs does Post for Me offer?",
        a: "We provide TypeScript, Python, Go, Ruby, and Kotlin SDKs. Find setup guides on our [GitHub repos](https://github.com/DayMoonDevelopment).",
      },
      {
        q: "Does Post for Me support webhooks?",
        a: "Yes, we offer webhooks for real-time post status updates and notifications.",
      },
      {
        q: "How do I integrate Post for Me into my app?",
        a: "Use our REST API or SDKs with setup instructions at [api.postforme.dev](https://api.postforme.dev) or our [GitHub repos](https://github.com/DayMoonDevelopment).",
      },
      {
        q: "Can I access platform-specific features?",
        a: "Yes, our unified API exposes unique features of each platform while simplifying integration.",
      },
    ],
  },
  {
    title: "Media Processing",
    faq: [
      {
        q: "How does Post for Me handle media uploads?",
        a: "We tailor your media to each platform’s requirements (e.g., size, format) and process it for posting.",
      },
      {
        q: "Can I store media with Post for Me?",
        a: "Yes, upload media to our storage, where it’s kept only until posting is complete, or use your own public or signed URLs.",
      },
      {
        q: "What are the media size limits?",
        a: "Limits vary by platform (e.g., TikTok’s video size caps). We automatically adjust media to comply.",
      },
      {
        q: "Do I need to pre-process media?",
        a: "No, we handle all media processing to meet each platform’s specifications.",
      },
      {
        q: "What happens to media after posting?",
        a: "Media uploaded to our storage is deleted after posting unless you specify otherwise.",
      },
    ],
  },
  {
    title: "Account and Setup",
    faq: [
      {
        q: "How do I sign up for Post for Me?",
        a: "Create an account at [postforme.dev](https://www.postforme.dev) and access API keys via the admin dashboard.",
      },
      {
        q: "Can I add multiple team members to the admin dashboard?",
        a: "Yes, our dashboard has no user cap, so invite your entire team to manage integrations.",
      },
      {
        q: "How do I change my account email?",
        a: "Update it in the admin dashboard settings at [postforme.dev](https://www.postforme.dev).",
      },
      {
        q: "How do I reset my API keys?",
        a: "Generate new keys in the admin dashboard; old keys will be invalidated.",
      },
      {
        q: "Can I cancel my account?",
        a: "Yes, delete your account via the dashboard or API, and export data first as deletion is irreversible.",
      },
    ],
  },
  {
    title: "Support and Resources",
    faq: [
      {
        q: "What support options does Post for Me offer?",
        a: "We provide live chat on [postforme.dev](https://www.postforme.dev) and email support at [postforme@daymoon.dev](mailto:postforme@daymoon.dev).",
      },
      {
        q: "Where can I find documentation?",
        a: "Check our API docs at [api.postforme.dev](https://api.postforme.dev) and setup guides on our [GitHub repos](https://github.com/DayMoonDevelopment).",
      },
      {
        q: "Are there additional resources for developers?",
        a: "Yes, explore platform-specific guides at [postforme.dev/resources](https://www.postforme.dev/resources) for TikTok, Instagram, and more.",
      },
      {
        q: "Do you offer onboarding assistance?",
        a: "Follow our [GitHub setup guides](https://github.com/DayMoonDevelopment) or contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for personalized support.",
      },
      {
        q: "How quickly do you respond to support queries?",
        a: "We aim to respond within 24 hours, with priority for enterprise users.",
      },
    ],
  },
  {
    title: "Technical Questions",
    faq: [
      {
        q: "What are the technical requirements for Post for Me?",
        a: "No specific requirements—just use our REST API, SDKs, or MCP server. The admin dashboard works on any modern browser.",
      },
      {
        q: "What are the rate limits for Post for Me?",
        a: "We don’t impose rate limits; only platform-specific limits apply (e.g., Instagram’s API caps).",
      },
      {
        q: "Which SDKs are available?",
        a: "TypeScript, Python, Go, Ruby, and Kotlin. See [GitHub](https://github.com/DayMoonDevelopment) for setup.",
      },
      {
        q: "Does Post for Me support MCP servers?",
        a: "Yes, we offer an MCP server for advanced integrations. Check [api.postforme.dev](https://api.postforme.dev).",
      },
      {
        q: "Can I test the API before purchasing?",
        a: "You’ll need an active plan to use the API, but our $5/month tier is low-cost to start.",
      },
    ],
  },
  {
    title: "Troubleshooting",
    faq: [
      {
        q: "Why can’t I connect a social media account?",
        a: "Check OAuth setup in your app or ensure credentials are valid. See platform guides at [postforme.dev/resources](https://www.postforme.dev/resources).",
      },
      {
        q: "What if my posts fail to publish?",
        a: "Check platform-specific errors via webhooks or contact support with logs at [postforme@daymoon.dev](mailto:postforme@daymoon.dev).",
      },
      {
        q: "Why is my media upload failing?",
        a: "Ensure media meets platform requirements or use our storage for automatic processing.",
      },
      {
        q: "How do I debug API issues?",
        a: "Review error codes in our [API docs](https://api.postforme.dev) or use SDK logs for details.",
      },
      {
        q: "What if I hit a platform rate limit?",
        a: "We notify you via webhooks; adjust posting schedules to align with platform limits.",
      },
    ],
  },
];
