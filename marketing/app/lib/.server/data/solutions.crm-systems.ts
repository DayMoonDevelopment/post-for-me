import type { SolutionData } from "./solutions";

export const crmSystems: SolutionData = {
  id: "crm-systems",
  nav: {
    title: "CRM Systems",
    description: "Enrich customer profiles with unified social interactions and lead nurturing",
  },
  meta: {
    title: "Social CRM Integration API for Customer Relationship Management | Post for Me",
    description:
      "Add social interactions to your CRM. Automate lead nurturing, customer engagement, and social listening across 9 platforms. Unify social data with customer profiles. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "Unite social interactions with customer relationships.",
    description:
      "Integrate social posting, monitoring, and analytics directly into your CRM workflows. One API enriches customer profiles with social data, automates lead nurturing campaigns, and tracks engagement—all without fragmenting your customer view.",
  },
  valueProposition: {
    headline: "Complete customer profiles with social context",
    subheadline:
      "We handle social platform complexity so you can build features that turn social interactions into sales opportunities and customer loyalty.",
    weHandle: [
      "Multi-platform posting and scheduling infrastructure",
      "OAuth flows for customer and team social accounts",
      "Platform API changes and compliance",
      "Feed aggregation from customer social profiles",
      "Analytics collection across platforms",
      "Real-time webhook notifications",
      "Rate limiting and error handling",
    ],
    youCan: [
      "Automate social lead nurturing campaigns",
      "Enrich contacts with social profile data",
      "Enable social selling for sales teams",
      "Track customer engagement across platforms",
      "Build social listening and monitoring features",
      "Integrate social metrics into customer scoring",
    ],
  },
  coreFeatures: {
    headline: "Social CRM without the integration overhead",
    features: [
      {
        title: "Automate social lead nurturing",
        description:
          "Trigger social posts based on CRM workflows—welcome new leads, follow up on opportunities, or celebrate customer milestones. Schedule drip campaigns across platforms. Track which social touches convert to meetings and deals for full attribution.",
      },
      {
        title: "Unified social customer profiles",
        description:
          "Aggregate social interactions, mentions, and engagement data into customer records. See the complete conversation history across platforms alongside emails and calls. Support social selling with automated outreach and relationship building at scale.",
      },
      {
        title: "Team-based social management",
        description:
          "Enable sales, support, and marketing teams to post from company accounts or personal profiles. Role-based permissions control who can post and schedule. Track team performance with social engagement metrics tied to pipeline and revenue goals.",
      },
    ],
  },
  developerExperience: {
    headline: "Social features that fit your CRM architecture.",
    subheadline: "One API for posting, monitoring, and enriching customer data.",
    benefits: [
      {
        title: "Integrate social into existing workflows",
        description:
          "Trigger posts from automation rules, opportunity stages, or contact assignments. Fetch social profile data to enrich contact records. REST API and SDKs (TypeScript, Python, Go, Ruby, Kotlin) fit seamlessly into your CRM backend without architectural changes.",
      },
      {
        title: "Enterprise-ready scaling",
        description:
          "Team-based billing supports multi-tenant CRM architectures. Unlimited users per team, unlimited customer accounts, unlimited projects. Start at $10/mo per team and scale independently for each client or department without per-seat licensing complexity.",
      },
      {
        title: "Analytics for customer intelligence",
        description:
          "Combine social engagement metrics with CRM data for 360° customer views. Track social influence scores, sentiment trends, and engagement patterns. Export to BI tools or visualize in custom dashboards—all through the same API used for posting.",
      },
    ],
  },
};
