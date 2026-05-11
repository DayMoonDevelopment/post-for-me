import {
  IconCode,
  IconArCube1,
  IconApiAggregate,
} from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import type { Route } from "../+types/route";

const iconMap = {
  0: IconCode,
  1: IconArCube1,
  2: IconApiAggregate,
};

export const DeveloperExperience = () => {
  const { solution } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="flex items-center justify-center py-14">
      <div className="max-w-(--breakpoint-xl) w-full px-6">
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center max-w-2xl text-balance mx-auto mb-4">
          {solution.developerExperience.headline}
        </h2>
        <p className="text-lg text-muted-foreground text-center text-balance max-w-2xl mx-auto mb-10 sm:mb-16">
          {solution.developerExperience.subheadline}
        </p>

        <div className="grid sm:grid-cols-3 gap-6">
          {solution.developerExperience.benefits.map(({ title, description }, index) => {
            const Icon = iconMap[index as keyof typeof iconMap];
            return (
              <div
                key={index}
                className="flex flex-col border rounded-xl py-6 px-5 bg-card"
              >
                <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-full mb-4">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-foreground/80 text-[15px]">
                  {description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
