import {
  IconCode,
  IconPullRequest,
  IconShieldCheck,
} from "@central-icons/outlined";

import { Badge } from "~/ui/badge";

const pillars = [
  {
    icon: IconCode,
    title: "Read every line",
    description:
      "See how we handle your tokens, your media, and your customers' OAuth grants before you trust us with them.",
  },
  {
    icon: IconPullRequest,
    title: "Watch us build",
    description:
      "Every fix, feature, and refactor ships through public pull requests. No hidden private branch.",
  },
  {
    icon: IconShieldCheck,
    title: "Steer the roadmap",
    description:
      "Open an issue, vote on a feature, send a PR. What ships next is shaped in the open, not behind a sales call.",
  },
];

export const WhyOpenSource = () => {
  return (
    <div className="bg-background">
      <div className="max-w-(--breakpoint-xl) w-full py-20 px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left: founder narrative */}
          <div className="flex flex-col gap-6">
            <Badge variant="outline" className="self-start">
              Why we open-sourced
            </Badge>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] text-balance">
              The infrastructure your product runs on shouldn&apos;t be a black
              box.
            </h2>

            <div className="flex flex-col gap-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              <p>
                Post for Me sits between your product and nine social platforms.
                It holds your customers&apos; OAuth tokens. It moves their
                media. It retries their failed posts at 3 a.m.
              </p>
              <p>
                That&apos;s a lot of trust to extend to a closed API.
              </p>
              <p>
                So we put the code in public. Every commit, every pull request,
                every roadmap decision lives on GitHub. You can read how we
                handle your tokens before you connect one. You can watch us fix
                a bug the day after you report it. You can shape the next
                release by opening an issue.
              </p>
              <p className="text-foreground font-medium">
                That&apos;s what we mean by open source. Transparency to build
                trust.
              </p>
            </div>
          </div>

          {/* Right: trust pillars */}
          <div className="flex flex-col gap-4">
            {pillars.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-5 p-6 rounded-2xl border bg-card"
              >
                <div className="flex items-center justify-center size-12 rounded-xl bg-muted shrink-0">
                  <Icon className="size-6 text-pop" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
