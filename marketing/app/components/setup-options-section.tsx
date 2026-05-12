import { IconCheckmark1 } from "@central-icons/filled";
import { IconRocket, IconTag } from "@central-icons/outlined";

import { Link } from "~/components/link";

const setupOptions = [
  {
    icon: IconRocket,
    title: "Quickstart Project",
    tagline: "Start posting in minutes",
    description:
      "Use Post for Me credentials across every platform. No developer approval needed.",
    benefits: [
      "Instant access to all platforms",
      "No platform approval process",
      "Full access to feeds and analytics",
    ],
    tradeoff:
      "Users see \"Post for Me\" during OAuth",
  },
  {
    icon: IconTag,
    title: "White Label Project",
    tagline: "Your brand, your credentials",
    description:
      "Use your own developer credentials so users see your app name in OAuth.",
    benefits: [
      "Full brand customization",
      "Complete ownership of credentials",
      "Professional user experience",
    ],
    tradeoff:
      "Requires platform developer approval",
  },
];

export const SetupOptionsSection = () => {
  return (
    <div className="max-w-(--breakpoint-lg) w-full mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.03em] mb-2">
          Two ways to get started
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {`Both options follow the same `}
          <Link
            to="/pricing"
            className="text-primary underline underline-offset-2"
          >
            pricing tiers
          </Link>
          {` based on post volume.`}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {setupOptions.map(
          ({ title, tagline, description, benefits, tradeoff, icon: Icon }) => (
            <div
              key={title}
              className="bg-card border rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon className="size-5 text-pop" />
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {tagline}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {description}
              </p>

              <ul className="flex flex-col gap-2 mb-4">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <IconCheckmark1 className="size-4 text-affirmative shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground border-t pt-3">
                {tradeoff}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
};
