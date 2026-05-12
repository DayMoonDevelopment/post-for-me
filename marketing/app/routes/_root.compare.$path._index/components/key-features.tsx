import { IconGithub } from "@central-icons/filled";
import { IconApiConnection, IconCode, IconMultiMedia, IconReceiptCheck, IconSupport } from "@central-icons/outlined";

import { Link } from "~/components/link";

import { Button } from "~/ui/button";

import type { ComponentType, ReactNode } from "react";

interface KeyFeature {
  title: string;
  description: ReactNode;
  icon: ComponentType<{ className?: string }>;
}

export const KeyFeatures = () => {

  const keyFeatures: KeyFeature[] = [
    {
      title: "Pay for Usage, Not Users",
      description: "We charge you for posts, not people. Unlimited connected accounts, unlimited team members - no growth tax on your success.",
      icon: IconReceiptCheck
    },
    {
      title: "Production-Ready from Day One",
      description: "Enterprise-grade infrastructure that works for real products. <strong>Not a side project</strong> - build with confidence that our API won't break in production.",
      icon: IconApiConnection
    },
    {
      title: "Scale Without Limits",
      description: "No artificial caps on accounts, posts, or users. Grow from 0 to 1,000,000 customers without ever changing tiers or getting surprise bills.",
      icon: IconCode
    },
    {
      title: "Your Roadmap, Yours",
      description: "Comprehensive SDKs for every major language + HTML support in descriptions. Build your product while we handle the social media complexity.",
      icon: IconMultiMedia
    },
    {
      title: "Full Transparency",
      description: "Open source with public roadmap. No hidden enterprise pricing, usage restrictions, or feature gates - <strong>what you see is what you get</strong>.",
      icon: IconGithub
    },
    {
      title: "Developer Support",
      description: (
        <>
          Direct support from engineers who built this stuff, not support reps who read scripts. Plus an active{" "}
          <Link to="https://discord.gg/nKSWqgfn" className="underline hover:text-foreground underline-offset-2">
            Discord community
          </Link>
          .
        </>
      ),
      icon: IconSupport
    }
  ];

  return (
    <div className="bg-background">
      <div className="max-w-(--breakpoint-xl) w-full py-16 px-4 mx-auto">
        <div className="flex flex-col gap-12 max-w-6xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-[-0.03em] mb-4">
              Built to Scale Your SaaS
            </h2>
            <p className="text-muted-foreground text-lg text-balance">
              Post for Me provides enterprise infrastructure from day one without the enterprise baggage. No per-user fees, no artificial limits, no surprise tier migrations.
            </p>
            <p className="text-muted-foreground text-lg text-balance mt-4">
              Focus on building your product while we handle the social complexity. Pricing that scales with your usage, not your user count.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {keyFeatures.map((feature, index) => (
              <div key={index} className="flex flex-col gap-4 p-6 bg-muted/30 rounded-xl border border-muted/40">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-12 bg-background rounded-lg">
                    <feature.icon className="size-6 text-pop" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg">
              <Link to="https://app.postforme.dev">
                Start Building with Post for Me
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
