import { IconCheckmark1 } from "@central-icons/outlined";
import { useState } from "react";
import { Link, useLoaderData } from "react-router";

import { Button } from "~/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";
import { Separator } from "~/ui/separator";

import type { Route } from "./+types/route";

export function Component() {
  const { tiers } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);

  const selectedTier = tiers[selectedTierIndex];

  return (
    <div className="flex flex-col items-center justify-center pt-32 px-6">
      <h1 className="text-5xl sm:text-6xl font-semibold text-center tracking-tighter">
        Predictable pricing <br />
        without surprises.
      </h1>

      <div className="my-12 sm:mt-16 max-w-(--breakpoint-sm) mx-auto">
        <div className="border rounded-lg p-6 mx-auto">
          <div className="flex flex-row gap-4 items-start justify-between">
            <div className="flex-1">
              <p className="text-4xl font-bold">
                ${selectedTier.price.toLocaleString()}
                <span className="text-lg text-muted-foreground">{`/mo`}</span>
              </p>
            </div>

            <Select
              value={selectedTierIndex.toString()}
              onValueChange={(value) => setSelectedTierIndex(parseInt(value))}
            >
              <SelectTrigger className="w-42">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tier, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {`${tier.posts.toLocaleString()} Social Posts`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <h2 className="mt-2 font-medium text-muted-foreground">
            {`Everything you need to build and scale.`}
          </h2>

          <Separator className="mt-4 mb-6" />

          <Button size="lg" className="w-full" asChild>
            <Link to="https://app.postforme.dev" target="_blank">
              Get Started
            </Link>
          </Button>

          <ul className="space-y-2 mt-8">
            {selectedTier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <IconCheckmark1 className="h-4 w-4 mt-1 text-green-600" />{" "}
                {feature}
              </li>
            ))}
          </ul>

          <Separator className="mt-8 mb-6" />

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              What happens when I go over my plan?
            </h3>
            <p className="text-sm text-muted-foreground">
              {`We want you to succeed, and not be afraid of surprise charges. If
              you unexpectedly go over the limits of your plan, we won't shut
              you down or charge you extra automatically. If your
              usage is consistently exceeding the limits, we'll reach out about upgrading your account.`}
            </p>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-(--breakpoint-sm) shadow-none bg-muted py-10">
        <CardHeader className="px-8">
          <CardTitle className="mb-1 text-4xl font-semibold tracking-tighter">
            Need more support or higher usage?
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Contact us for a tailored plan to meet higher enterprise-level
            needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-2 flex flex-row gap-2 px-8">
          <Button asChild>
            <Link
              to="https://cal.com/team/day-moon/post-for-me-enterprise-plan-inquiry"
              target="_blank"
            >
              Get in Touch
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
