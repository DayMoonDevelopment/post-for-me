import { Link, useLoaderData } from "react-router";
import { ArrowUpRight, CirclePlay } from "lucide-react";

import { RotatingText } from "~/components/rotating-text";

import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";

import { BackgroundPattern } from "./background-pattern";

import type { Route } from "../+types/route";

const rotatingText = [
  "product",
  "AI content generator",
  "marketing team",
  "social media scheduler",
  "game",
  "SaaS",
];

export const Hero = () => {
  const { app } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <BackgroundPattern />

      <div className="relative z-10 text-center max-w-3xl">
        <Badge
          variant="secondary"
          className="rounded-full py-1 border-border"
          asChild
        >
          <Link to={app.url}>
            {`🚀 latest release v${app.version}`}
            <ArrowUpRight className="ml-1 size-4" />
          </Link>
        </Badge>
        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl md:leading-[1.2] font-semibold tracking-tighter">
          <span className="sr-only">
            {`Power your product, ai content generator, marketing team, social media scheduler, game, or saas with social media posting infrastructure.`}
          </span>
          <span>
            Social media posting <br />
            infrastructure for your
          </span>
          <br />
          <RotatingText
            text={rotatingText}
            duration={3000}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </h1>
        <p className="mt-6 md:text-lg text-balance">
          Quickly integrate social media platforms directly into your product to
          power <span className="font-bold">posting</span>,{" "}
          <span className="font-bold">feeds</span>,{" "}
          <span className="font-bold">metrics</span>, and more through a single,
          simple API.
        </p>
        <div className="mt-12 flex items-center justify-center gap-4">
          <Button size="lg" className="rounded-full text-base" asChild>
            <Link to="https://app.postforme.dev" target="_blank">
              Get Started <ArrowUpRight className="h-5! w-5!" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full text-base shadow-none"
          >
            <CirclePlay className="h-5! w-5!" /> Watch Demo
          </Button>
        </div>
      </div>
    </div>
  );
};
