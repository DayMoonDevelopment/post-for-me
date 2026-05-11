import { IconBookmarkCheck, IconPieChart1, IconTarget } from "@central-icons/outlined";
import { IconArrowUpRight } from "@central-icons/outlined";

import { CodeSamples } from "~/components/code-samples";
import { Link } from "~/components/link";

import { cn } from "~/lib/utils";

import { Button } from "~/ui/button";

const features = [
  {
    icon: IconTarget,
    title: "REST API",
    description: "Simple, single point of entry for every platform.",
    link: "https://api.postforme.dev/docs#description/getting-started",
  },
  {
    icon: IconBookmarkCheck,
    title: "SDK's",
    description: "Drop-in libraries for rapid integration.",
    link: "https://api.postforme.dev/docs#description/client-libraries",
  },
  {
    icon: IconPieChart1,
    title: "Webhooks",
    description: "Real-time account connections and post status.",
    link: "https://api.postforme.dev/docs#tag/webhooks",
  },
];

export const Integration = () => {
  return (
    <div
      id="integration"
      className="dark flex items-center justify-center px-4"
    >
      <div className="max-w-(--breakpoint-xl) grid lg:grid-cols-5 gap-4 lg:gap-8 w-full py-4 px-4 lg:py-7 lg:px-8 bg-card text-card-foreground rounded-4xl">
        <div className="lg:col-span-2 self-start flex flex-col w-full mx-auto gap-6 lg:gap-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.03em] max-w-lg">
            Building native social media integrations shouldn’t drain dev
            resources.
          </h2>

          <div className="w-full flex flex-col gap-2">
            {features.map(({ title, description, icon: Icon, link }, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-row gap-2 border-pop/25 mb-2 pb-3 pl-1",
                  index !== features.length - 1 && "border-b-2",
                )}
              >
                <Icon className="text-pop" />
                <div>
                  <h3 className="text-lg">{title}</h3>
                  <div className="text-[17px] leading-relaxed text-muted-foreground">
                    {description}
                  </div>
                  <Button asChild size="sm" mode="link">
                    <Link to={link} target={"_blank"}>
                      Docs
                      <IconArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Media */}
        <div className="lg:col-span-3 flex flex-col items-center relative min-w-0 overflow-hidden">
          <CodeSamples />
          <Button className="mt-4 mx-auto" asChild>
            <Link to="https://app.postforme.dev" target="_blank">
              🚀 Start Coding Today
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
