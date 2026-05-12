import { IconArrowRight } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { PostForMeBrandIcon } from "~/components/post-for-me-brand-icons";

import { Separator } from "~/ui/separator";

import type { Route } from "../+types/route";

export const ValueProposition = () => {
  const { solution } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="flex items-center justify-center py-14">
      <div className="max-w-(--breakpoint-xl) w-full px-6">
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center max-w-3xl text-balance mx-auto mb-4">
          {solution.valueProposition.headline}
        </h2>
        <p className="text-lg text-muted-foreground text-center text-balance max-w-2xl mx-auto mb-10">
          {solution.valueProposition.subheadline}
        </p>
        <div className="max-w-(--breakpoint-lg) grid md:grid-cols-2 gap-8 mx-auto">
          {/* We handle card */}
          <div className="flex flex-col border rounded-xl p-8 bg-card">
            <div className="flex flex-row gap-3 items-center">
              <div className="flex flex-col gap-2 items-center justify-center size-10 bg-muted rounded-full text-lg">
                <PostForMeBrandIcon className="size-6" />
              </div>

              <h3 className="text-2xl font-semibold">We handle</h3>
            </div>

            <Separator className="my-5" />

            <ul className="space-y-3">
              {solution.valueProposition.weHandle.map((item, index) => (
                <li
                  key={index}
                  className="text-foreground flex flex-row gap-2 items-baseline pl-1"
                >
                  <IconArrowRight className="text-pop size-5 pt-1.5" />
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* So you can card */}
          <div className="flex flex-col border rounded-xl p-8 bg-card">
            <div className="flex flex-row gap-3 items-center">
              <div className="flex flex-col gap-2 items-center justify-center size-10 bg-muted rounded-full text-lg">
                {`🫵`}
              </div>

              <h3 className="text-2xl font-semibold">So you can</h3>
            </div>

            <Separator className="my-5" />

            <ul className="space-y-3">
              {solution.valueProposition.youCan.map((item, index) => (
                <li
                  key={index}
                  className="text-foreground flex flex-row gap-2 items-baseline pl-1"
                >
                  <IconArrowRight className="text-pop size-5 pt-1.5" />
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
