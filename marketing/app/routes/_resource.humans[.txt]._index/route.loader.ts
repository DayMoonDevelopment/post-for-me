// Special thanks to teams and communities
const specialThanks = [
  { name: "React Router v7 Team", link: "https://reactrouter.com" },
  { name: "TailwindCSS Team", link: "https://tailwindcss.com" },
  { name: "shadcn/ui Community", link: "https://ui.shadcn.com" },
  { name: "Iconists team for Central Icons", link: "https://centralicons.com" },
  { name: "TypeScript Team", link: "https://www.typescriptlang.org" },
  { name: "Shiki Team", link: "https://shiki.style" },
  { name: "PostHog Team", link: "https://posthog.com" },
  { name: "TikTok", link: "https://www.tiktok.com" },
  { name: "Facebook", link: "https://www.facebook.com" },
  { name: "Instagram", link: "https://www.instagram.com" },
  { name: "X", link: "https://x.com" },
  { name: "LinkedIn", link: "https://www.linkedin.com" },
  { name: "Pinterest", link: "https://www.pinterest.com" },
  { name: "Bluesky", link: "https://bsky.app" },
  { name: "Threads", link: "https://www.threads.net" },
  { name: "YouTube", link: "https://www.youtube.com" },
];

export function loader() {
  const humansContent = `/* TEAM */

Developer: Day Moon Development
Contact: https://www.postforme.dev
Email: postforme@daymoon.dev
Location: USA

/* THANKS */

${specialThanks.map((thanks) => `${thanks.name} (${thanks.link})`).join("\n")}

/* SITE */

Last update: ${new Date().toISOString().split("T")[0]}
Language: English
Doctype: HTML5
IDE: VS Code, Claude Code
Tech Stack: React Router v7, TypeScript, TailwindCSS v4, Bun, SSR
Standards: HTML5, CSS3, ES2022
Components: shadcn/ui
Icons: Central Icons
Software: React, Bun
Analytics: PostHog

/* MISSION */

Making social media integrations simple for developers. We provide
a unified API that connects social platforms through a single
interface, replacing dozens of APIs with one.

Ship integrations in hours, not weeks.
`;

  return new Response(humansContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=604800, s-maxage=604800", // 7 days
      "Content-Length": humansContent.length.toString(),
    },
  });
}
