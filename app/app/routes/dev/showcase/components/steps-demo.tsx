import { ApiKeysIcon, BillingIcon, PostsIcon, SocialAccountsIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import {
  Step,
  StepContent,
  StepIndicator,
  Steps,
  type StepStatus,
} from "~/ui/steps";

import { Section } from "./section";

const ROWS: Array<{
  description: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  status: StepStatus;
  title: string;
}> = [
  {
    icon: BillingIcon,
    title: "Set up billing",
    description: "Add a payment method to activate the project.",
    status: "complete",
  },
  {
    icon: ApiKeysIcon,
    title: "Create an API key",
    description: "Authenticate your first request to the API.",
    status: "complete",
  },
  {
    icon: SocialAccountsIcon,
    title: "Connect an account",
    description: "Link a social account to publish to.",
    status: "current",
  },
  {
    icon: PostsIcon,
    title: "Publish your first post",
    description: "Send a post live to see the value end-to-end.",
    status: "upcoming",
  },
];

export function StepsDemo() {
  return (
    <div className="space-y-8">
      <Section title="Step rail">
        <div className="w-full max-w-md">
          <Steps>
            {ROWS.map((row) => {
              const Icon = row.icon;
              const isComplete = row.status === "complete";
              const isUpcoming = row.status === "upcoming";
              return (
                <Step
                  key={row.title}
                  status={row.status}
                  disabled={isUpcoming}
                >
                  <StepContent>
                    {/* The consumer owns the disabled look — the primitive
                        stays neutral. */}
                    <div
                      className={cn(
                        "flex items-center gap-3",
                        isUpcoming && "opacity-60",
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4">
                        <Icon />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-heading text-sm font-semibold text-foreground">
                          {row.title}
                        </span>
                        <span className="text-xs/relaxed text-muted-foreground">
                          {row.description}
                        </span>
                      </div>
                      <Button
                        variant={isComplete ? "ghost" : "default"}
                        size="sm"
                        disabled={isUpcoming}
                      >
                        {isComplete ? "Review" : "Get started"}
                      </Button>
                    </div>
                  </StepContent>
                </Step>
              );
            })}
          </Steps>
        </div>
      </Section>

      <Section title="Indicators">
        {(["complete", "current", "upcoming"] as const).map((status) => (
          <div key={status} className="flex flex-col items-center gap-2">
            <StepIndicator status={status} />
            <span className="text-xs text-muted-foreground">{status}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}
