import { IconTarget, IconRocket, IconAgent } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import {
  Feature,
  FeatureContent,
  FeatureGrid,
  FeatureGridContent,
  FeatureGridHeader,
  FeatureHeader,
  FeatureTitle,
} from "~/components/feature-grid-layout";

import type { Route } from "../+types/route";

const iconMap = {
  0: IconTarget,
  1: IconAgent,
  2: IconRocket,
};

export const CoreFeatures = () => {
  const { solution } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <FeatureGrid>
      <FeatureGridHeader>
        <h2 className="col-span-full text-4xl sm:text-5xl font-semibold tracking-tight text-center max-w-2xl text-balance mx-auto px-4">
          {solution.coreFeatures.headline}
        </h2>
      </FeatureGridHeader>

      <FeatureGridContent>
        {solution.coreFeatures.features.map(({ title, description }, index) => {
          const Icon = iconMap[index as keyof typeof iconMap];
          return (
            <Feature key={index}>
              <FeatureHeader>
                <Icon />
                <FeatureTitle>{title}</FeatureTitle>
              </FeatureHeader>

              <FeatureContent>{description}</FeatureContent>
            </Feature>
          );
        })}
      </FeatureGridContent>
    </FeatureGrid>
  );
};
