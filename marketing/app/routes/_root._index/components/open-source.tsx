import { Link } from "react-router";
import { ArrowRightIcon } from "icons";

export const OpenSource = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <b className="text-muted-foreground uppercase font-semibold text-sm">
        Open Source
      </b>
      <h2 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight max-w-xl text-balanced">
        We believe in the power of open source for transparency and trust.
      </h2>
      <p className="mt-4 text-base sm:text-lg text-muted-foreground flex flex-row gap-1.5 items-center justify-center text-center">
        Check out our codebase on
        <Link
          to="https://github.com/DayMoonDevelopment/post-for-me"
          target="_blank"
          className="flex flex-row gap-0.5 items-center hover:underline underline-offset-3"
        >
          GitHub
          <ArrowRightIcon className="size-4" />
        </Link>
      </p>
    </div>
  </div>
);
