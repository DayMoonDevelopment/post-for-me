import { IconArrowRight } from "@central-icons/outlined";

import { Link } from "~/components/link";

import { Badge } from "~/ui/badge";

export const OpenSource = () => (
  <div
    id="open-source"
    className="flex items-center justify-center py-16 bg-muted"
  >
    <div className="text-center">
      <Badge>Open Source</Badge>
      <h2 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight max-w-xl text-balanced">
        We believe in the power of open source for transparency and trust.
      </h2>
      <p className="mt-4 text-base sm:text-lg text-muted-foreground flex flex-row gap-1.5 items-center justify-center text-center mx-12">
        Check out our codebase on
        <Link
          to="https://github.com/DayMoonDevelopment/post-for-me"
          target="_blank"
          className="flex flex-row gap-0.5 items-center hover:underline underline-offset-3"
        >
          GitHub
          <IconArrowRight className="size-4" />
        </Link>
      </p>
    </div>
  </div>
);
