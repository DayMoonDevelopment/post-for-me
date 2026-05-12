import { Link } from "~/components/link";

import { Avatar, AvatarImage } from "~/ui/avatar";
import { Separator } from "~/ui/separator";

import { Services } from "./components/differentiators";
export function Component() {
  return (
    <div className="flex flex-col pt-24 gap-12">
      {/* Hero */}
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-4">
        <p className="max-w-3xl mx-auto text-2xl font-medium tracking-tighter text-muted-foreground">
          Creators of Post for Me
        </p>
        <h1 className="max-w-3xl mx-auto text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          Day Moon Development
        </h1>
      </div>
      <Separator className="max-w-3xl w-full mx-auto" />
      {/* Origins */}
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6 text-base md:text-lg">
            <p>
              We (
              <span className="inline-flex items-center gap-1 align-middle">
                <Avatar className="size-7">
                  <AvatarImage src="/caleb.jpeg" />
                </Avatar>
                <Link to="https://x.com/CalebPanza" highlight>
                  Caleb
                </Link>
              </span>
              {` and `}
              <span className="inline-flex items-center gap-1 align-middle">
                <Avatar className="size-7">
                  <AvatarImage src="/matt.jpeg" />
                </Avatar>
                <Link to="https://x.com/MisterMattRoth" highlight>
                  Matt
                </Link>
              </span>
              ) kicked off{" "}
              <Link to="https://www.daymoon.dev">Day Moon Development</Link>{" "}
              back in 2023. We&apos;d met in college and stayed in touch as we built
              our careers in software, touching everything from e-commerce and
              nonprofits to mobile and web apps.
            </p>
            <p>
              By 2024, we decided to go all-in as partners. We wanted to create
              a company that cuts through the noise and delivers straightforward
              software solutions for real challenges. No overcomplicating
              things, just solid engineering that helps teams and founders get
              where they need to go.
            </p>
          </div>
        </div>
      </div>
      {/* Services Overview */}
      <Services />
      {/* Vision and Post for Me */}
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6 text-base md:text-lg">
            <p>
              We&apos;ve always kept an eye out for the problems that pop up again
              and again in our client projects. When we see those patterns, we
              turn them into products that anyone can use, helping folks from
              big companies to solo indie hackers scale up without the hassle.
            </p>
            <p>
              That&apos;s how{" "}
              <Link to="/about" className="text-primary hover:underline">
                Post for Me
              </Link>{" "}
              came about, our first real product out the door. We noticed
              everyone struggling with social media integrations amid all the AI
              content hype and the push for steady posting. Rather than rebuild
              the wheel for each client, we created the unified API we&apos;d been
              wishing for. It lets you boost your online presence without
              starting from zero every time.
            </p>
            <p>
              This is our style: taking those one-off fixes and turning them
              into tools that solve issues quickly for more people.
            </p>

            <p>
              {`We'd love to chat about how we can support your ideas. If you're using Post for Me and want to talk enterprise options, or if you need help with digital audits, SEO, or custom builds, drop us a line at `}
              <Link
                to="https://daymoon.dev"
                target="_blank"
                className="text-primary hover:underline"
              >
                daymoon.dev
              </Link>
              . We want to see you succeed quickly and without exhausting teams
              or budget.
            </p>

            <p>
              Would love to hear from you!
              <br />
              Caleb & Matt from Day Moon 🌙
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
