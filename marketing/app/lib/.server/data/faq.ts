export const faq: { q: string; a: string; featured: boolean }[] = [
  {
    q: "Do I need separate credentials for each social network?",
    a: "We offer the use of our credentials as an addon OR you can bring your own app credentials from the social network so you stay in control of data and limits. Our dashboard guides the setup.",
    featured: true,
  },
  {
    q: "What happens if a post fails?",
    a: "You won't be billed for the post and can try to post it again. We're working on expanding configurations for automated retries.",
    featured: true,
  },
  {
    q: "Are there hard rate limits?",
    a: `We do not limit account connections nor seat caps for the dashboard. Throughput is governed only by the social networks' own limits.`,
    featured: false,
  },
  {
    q: "Is there a free tier?",
    a: "Your first 50 posts each month are free, perfect for testing and small launches.",
    featured: true,
  },
  {
    q: "How is billing handled?",
    a: "Usage is metered daily, billed monthly in USD via Stripe. Volume discounts apply automatically.",
    featured: false,
  },
  {
    q: "How does media upload work?",
    a: "In a post, you can send any publicly accessible media. If you don't have your own storage, you can upload your media to us to get a public URL. Media uploaded to our servers are deleted after successful posting.",
    featured: false,
  },
  {
    q: "Where can I see code samples?",
    a: "The Docs link in the navbar provides example requests in dozens of languages, including JavaScript, Python, and Java.",
    featured: false,
  },
  {
    q: 'What does "Use your own App Credentials" mean?',
    a: "All you need to do is get app credentials from the social platform and we handle the rest. This ensures when users connect their accounts they see your brand and ultimately allows you to own the connections",
    featured: true,
  },
  {
    q: "Do I need to go through app approval on TikTok, Facebook, Instagram, etc.?",
    a: "Nope! You can use our crendetials and skip the verification process. If you use your own app credentials then each app will need to go through approval before going live. We are to help! Contact us any time to walk you through the approval process.",
    featured: false,
  },
  {
    q: "Do I need to handle OAuth flows?",
    a: "Nope! We handle all the OAuth flows for you. You just need to give your users a button to connect their accounts.",
    featured: false,
  },
  {
    q: "Why should I use this?",
    a: "Navigating through integrations for each social platform can be a pain. Each one has different media requirements and workflows. We handle all of that for you, so you can focus on building what matters.",
    featured: true,
  },
  {
    q: "How do I get started?",
    a: `Getting started is simple. Signup for an account, plug in your App credentials OR use ours, create an API key, and then start posting!`,
    featured: true,
  },
];
