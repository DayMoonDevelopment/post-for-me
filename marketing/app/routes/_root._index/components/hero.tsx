import { IconArrowUpRight } from "@central-icons/outlined";

import { Link } from "~/components/link";
import { RotatingText } from "~/components/rotating-text";

import { Button } from "~/ui/button";

import { OrbitingIcons } from "./orbiting-icons";

const rotatingText = [
  "SaaS product",
  "AI content generator",
  "marketing team",
  "social media scheduler",
  "game",
];

export const Hero = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <OrbitingIcons />

      <div className="relative z-10 text-center max-w-3xl">
        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl md:leading-[1.2] font-semibold tracking-tighter">
          <span className="sr-only">
            {`Ship social media integrations for your product, ai content generator, marketing team, social media scheduler, game, or saas in hours, not weeks.`}
          </span>
          <span>Ship social media</span>
          <br />
          <span>integrations for your</span>
          <br />
          <RotatingText
            text={rotatingText}
            duration={3000}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
          <span>in hours, not weeks.</span>
        </h1>
        <p className="mt-6 md:text-lg text-balance">
          Quickly integrate social media platforms directly into your product to
          power <span className="font-bold">posting</span>,{" "}
          <span className="font-bold">feeds</span>,{" "}
          <span className="font-bold">analytics</span>, and more through a
          single, simple API.
        </p>
        <div className="mt-12 flex items-center justify-center gap-4">
          <Button size="lg" className="rounded-full text-base" asChild>
            <Link to="https://app.postforme.dev" target="_blank">
              Get Started <IconArrowUpRight className="h-5! w-5!" />
            </Link>
          </Button>
          {/***

          <Button
            variant="outline"
            size="lg"
            className="rounded-full text-base shadow-none"
          >
            <CirclePlay className="h-5! w-5!" /> Watch Demo
          </Button>

          */}
        </div>
      </div>
    </div>
  );
};
