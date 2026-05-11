import { Link } from "~/components/link";

import { Separator } from "~/ui/separator";

import { Differentiators } from "./components/differentiators";

export function Component() {
  return (
    <div className="flex flex-col pt-24 gap-12">
      {/* Hero */}
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-4">
        <h1 className="max-w-3xl mx-auto text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          A developer-first unified social media API
        </h1>
      </div>
      {/* Video */}
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden">
            <iframe
              src="https://www.youtube-nocookie.com/embed/3CAZhwUdtfw"
              title="Post for Me Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        </div>
      </div>

      <Separator className="max-w-3xl w-full mx-auto" />

      {/* Story */}
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6 text-base md:text-lg">
            <p>
              {`At `}
              <Link
                to="https://daymoon.dev"
                className="text-primary hover:underline"
              >
                Day Moon Development
              </Link>
              , we started seeing a flood of client requests for social media
              integrations. It seemed like with LLMs and AI coding tools, it was
              getting easier to build fast. And at the same time, platform
              algorithms were more rewarding to anyone who posted consistently.
            </p>
            <p>
              Suddenly, there were real reasons to add social posting to all
              kinds of products: workflow tools that needed organic outreach,
              AI-powered content apps, or dashboards that helped manage multiple
              accounts. Developers were moving quickly, and their users wanted
              to share everywhere without friction.
            </p>
            <p>
              The problem, though, were the integrations themselves. We kept
              running into the same headaches for every client: each platform
              handled media, auth, and updates in its own way. A simple feature
              could eat weeks of dev time, pulling focus away from what actually
              mattered to the product.
            </p>
          </div>
        </div>
      </div>
      {/* Conclusion */}
      <div className="w-full">
        <div className="max-w-(--breakpoint-xl) mx-auto px-4 border-pop/20 border-y py-16">
          <h2 className="max-w-3xl mx-auto text-center text-balance text-3xl text-muted-foreground leading-tight tracking-tight">
            Post for Me is the tool we wished we had.
          </h2>
        </div>
      </div>
      {/* Challenges */}
      <div className="w-full">
        <div className="max-w-(--breakpoint-xl) mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6 text-base md:text-lg">
              <p>
                After building the same integrations over and over, the patterns
                became obvious. Every platform did things a little differently:
                media processing, OAuth flows, webhooks versus polling. The
                little differences added up to a lot of overhead.
              </p>
              <p>
                {`We ended up spending more time maintaining fragile
                infrastructure than building features. Existing tools weren't
                much help either. Most were built for end users first, with APIs
                tacked on later. That meant hidden limits, costs that spiked
                fast, and restrictions that forced awkward workarounds.`}
              </p>
              <p>
                {`So we took everything we'd learned and built a single API around
                the stuff that stays the same across platforms: connecting
                accounts, handling media, posting content, pulling analytics. We
                kept the common path dead simple.`}
              </p>
              <p>
                {`At the same time, we left the door open for platform-specific
                needs. Posting to Instagram stories instead of the feed? Pinning
                to a particular Pinterest board? It's just an extra parameter.
                No need to learn a whole new endpoint.`}
              </p>
              <p>
                We designed it the way we wanted tools to be designed: clean
                docs, predictable behavior, no surprise caps. Integrate once and
                post anywhere, then get back to building the parts of your
                product that actually matter.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Differentiators />
      {/* Commitment */}
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6 text-base md:text-lg">
            <p>
              {"We treat developers as partners, not just users. The code is "}
              <Link
                to="https://github.com/DayMoonDevelopment/post-for-me"
                target="_blank"
                className="text-primary hover:underline"
              >
                open source on GitHub
              </Link>
              {`, the pricing is clear, and the docs don't hide anything.`}
            </p>
            <p>
              Post for Me grows with you. Start at{" "}
              <Link to="/pricing" className="text-primary hover:underline">
                $10 a month
              </Link>
              , then scale seamlessly to thousands of posts a day, and never hit
              a wall that forces you to rewrite how your app works.
            </p>
            <p>
              {`We're developers ourselves. We built this because we needed it
              while working on client projects, polished it through real use,
              and open-sourced it because good tools should be available to
              everyone.`}
            </p>
            <p>
              {`Now it's yours. And we can't wait to see what you build with it.`}
            </p>
            <p>
              {`Happy hacking!`}
              <br></br>
              {`The team at Day Moon 🌙`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
