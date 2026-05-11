import { IconArrowUpRight, IconCheckmark1 } from "@central-icons/outlined";

import { Link } from "~/components/link";

import { Button } from "~/ui/button";

export const Pricing = () => {
  return (
    <div className="flex items-center justify-center bg-muted py-14">
      <div className="max-w-(--breakpoint-lg) w-full px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-4">
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">
              Predictable pricing without surprises
            </h2>
            <p className="text-lg text-muted-foreground">
              {`Usage-based pricing starting at`}
              <span className="font-bold">{` $10/mo for 1,000 posts `}</span>
              {`up to`}
              <span className="font-bold">{` unlimited scale`}</span>
              {`. Exceeding limits won't shut down or
              auto-charge.`}
            </p>
            <Button asChild size="lg" className="self-start">
              <Link to="/pricing">
                View Full Pricing
                <IconArrowUpRight />
              </Link>
            </Button>
          </div>

          <div className="bg-card rounded-xl p-8 border">
            <h3 className="text-xl font-semibold mb-6">All plans include</h3>
            <ul className="space-y-3 text-foreground/80">
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">All 9 social platforms</span>
              </li>
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1 font-semibold">
                  Unlimited social accounts
                </span>
              </li>
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">Unlimited projects and API keys</span>
              </li>

              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">Unlimited team members</span>
              </li>
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">Media processing and storage</span>
              </li>
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">Real-time webhooks</span>
              </li>
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">Analytics API</span>
              </li>
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">
                  <span className="font-bold">{`Quickstart Projects `}</span>
                  {`that don't require any setup`}
                </span>
              </li>
              <li className="flex flex-row gap-3">
                <IconCheckmark1 className="text-affirmative" />
                <span className="flex-1">
                  <span className="font-bold">{`White Label Projects `}</span>
                  {`that let you use your own social media developer accounts`}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
