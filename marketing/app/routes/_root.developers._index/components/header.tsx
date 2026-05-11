import { IconArrowUpRight } from "@central-icons/outlined";

import { Link } from "~/components/link";
import { SocialIconsRow } from "~/components/social-icons-row";

import { Button } from "~/ui/button";

export const Header = () => {
  return (
    <div className="max-w-(--breakpoint-xl) w-full grid md:grid-cols-2 gap-12 lg:gap-16 items-start py-16 px-4 bg-background mx-auto">
      {/* Left side: Title and CTAs */}
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
          Build social media integrations in minutes, not months
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <Link to="https://api.postforme.dev/docs" target="_blank">
              View API Docs
              <IconArrowUpRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="https://app.postforme.dev" target="_blank">
              Get Started
            </Link>
          </Button>
        </div>
      </div>

      {/* Right side: Description and social icons */}
      <div className="flex flex-col gap-6 pt-4">
        <SocialIconsRow iconClassName="size-6" className="gap-3 flex-wrap" />
        <p className="text-lg md:text-xl text-muted-foreground">
          A unified API that simplifies posting across all major social
          platforms. One integration, all platform customizations, unlimited
          possibilities.
        </p>
      </div>
    </div>
  );
};
