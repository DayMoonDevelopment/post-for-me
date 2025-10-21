import { BookCheck, ChartPie, Goal } from "lucide-react";

import { CodeSamples } from "./code-samples";

import { cn } from "~/lib/utils";

const features = [
  {
    icon: Goal,
    title: "REST API",
    description: "Simple, single point of entry for every platform.",
  },
  {
    icon: BookCheck,
    title: "SDK's",
    description: "Drop-in libraries for rapid integration.",
  },
  {
    icon: ChartPie,
    title: "Webhooks",
    description: "Real-time account connections and post status.",
  },
];

export const Developers = () => {
  return (
    <div className="dark flex items-center justify-center px-4">
      <div className="max-w-(--breakpoint-xl) grid lg:grid-cols-2 gap-8 w-full py-7 px-8 bg-card text-card-foreground rounded-4xl">
        <div className="self-start flex flex-col w-full mx-auto gap-12">
          <h2 className="text-4xl md:text-3xl font-semibold tracking-[-0.03em] max-w-lg">
            Building native social media integrations shouldn’t drain dev
            resources.
          </h2>

          <div className="w-full flex flex-col gap-2">
            {features.map(({ title, description, icon: Icon }, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-row gap-2 border-primary/25 mb-2 pb-3 pl-1",
                  index !== features.length - 1 && "border-b-2",
                )}
              >
                <Icon />
                <div>
                  <h3 className="text-lg">{title}</h3>
                  <div className="text-[17px] leading-relaxed text-muted-foreground">
                    {description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Media */}
        <CodeSamples />
      </div>
    </div>
  );
};
