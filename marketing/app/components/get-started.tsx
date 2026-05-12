import { Link } from "~/components/link";

import { Button } from "~/ui/button";

export const GetStarted = () => {
  return (
    <div className="dark flex items-center justify-center">
      <div className="w-full max-w-(--breakpoint-xl) mx-auto text-center bg-card text-card-foreground py-16 px-12 rounded-3xl">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter">
          Start coding today
        </h2>
        <p className="mt-4 text-xl text-muted-foreground text-balance max-w-xl text-center mx-auto">
          Sign up for an account and start integrating social media posting,
          feeds, and metrics into your product.
        </p>

        <Button className="mt-10" asChild>
          <Link to="https://app.postforme.dev" target="_blank">
            🚀 Get Started
          </Link>
        </Button>
      </div>
    </div>
  );
};
