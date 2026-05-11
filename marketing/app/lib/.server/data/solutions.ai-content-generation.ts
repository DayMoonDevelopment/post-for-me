import type { SolutionData } from "./solutions";

export const aiContentGeneration: SolutionData = {
  id: "ai-content-generation",
  nav: {
    title: "AI Content Generation",
    description:
      "Close the loop between AI generation and social distribution with a unified API",
  },
  meta: {
    title: "AI Content Generation API for Social Media | Post for Me",
    description:
      "Focus on AI innovation while we handle distribution. Automate posting of LLM-generated content across 9 platforms with a single API. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "Build AI content pipelines without the distribution overhead.",
    description:
      "Power your AI content generation with automated social distribution. One API connects your AI generated text, images, and videos to all social media platforms. Focus on generation workflows while we handle posting, scheduling, and analytics.",
  },
  valueProposition: {
    headline: "Close the generation-to-distribution loop",
    subheadline:
      "We handle the social posting complexity so you can focus on AI innovation and unique generation workflows.",
    weHandle: [
      "Platform API changes and updates",
      "Media processing for AI-generated images and videos",
      "Format validation and optimization",
      "Cross-platform posting logic",
      "Rate limiting and retry handling",
      "OAuth flows and authentication",
      "Real-time posting status",
    ],
    youCan: [
      "Build unique AI generation workflows",
      "Optimize prompts and fine-tune models",
      "Create multimodal content pipelines",
      "Experiment with LLM outputs without distribution overhead",
      "Scale from prototype to production seamlessly",
      "Monitor content performance with analytics",
    ],
  },
  coreFeatures: {
    headline: "From AI output to audience in one API call",
    features: [
      {
        title: "Seamless integration for AI outputs",
        description:
          "Post LLM-generated text, AI-created images, or generated videos with a single API endpoint. Supports multimodal content across all 9 platforms with automatic format optimization and media processing.",
      },
      {
        title: "Built for AI automation workflows",
        description:
          "Webhooks notify you instantly when content posts or errors occur. Schedule AI-generated batches, review before publishing, and track engagement—all without leaving your generation pipeline.",
      },
      {
        title: "Scale with your AI experiments",
        description:
          "Start at $10/mo for 1,000 posts, then grow to millions as your AI tool gains users. Pay only for posts—unlimited projects, accounts, and API calls. No hidden fees as you iterate on generation models.",
      },
    ],
  },
  developerExperience: {
    headline: "The last mile for your AI content pipeline.",
    subheadline:
      "Automate end-to-end: generation to distribution to analytics.",
    benefits: [
      {
        title: "One API for all AI content types",
        description:
          "Whether you're generating blog-to-social posts, viral video captions, or image variations, post them all through one unified endpoint. Consistent format across TikTok, Instagram, X, LinkedIn, YouTube, and more.",
      },
      {
        title: "Drop-in integration for AI pipelines",
        description:
          "TypeScript, Python, Go, Ruby, and Kotlin SDKs integrate directly into your LLM workflows. Generate content with ChatGPT or Midjourney, then post it with 5 lines of code. Ship in hours, not weeks.",
      },
      {
        title: "Real-time feedback for automation",
        description:
          "Webhooks trigger on post success, failures, or engagement updates. Build reactive AI agents that learn from performance data or retry failed posts automatically—no polling required.",
      },
    ],
  },
};
