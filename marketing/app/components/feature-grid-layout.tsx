import * as React from "react";

import { cn } from "~/lib/utils";

function FeatureGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-grid"
      className={cn("flex items-center justify-center bg-muted", className)}
      {...props}
    >
      <div className="w-full max-w-[--breakpoint-xl] px-4 py-8">
        {props.children}
      </div>
    </div>
  );
}

// New: Full-width header that sits above the grid
function FeatureGridHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-grid-header"
      className={cn("my-8 text-center", className)} // you can adjust spacing
      {...props}
    />
  );
}

function FeatureGridContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-grid"
      className={cn("flex items-center justify-center bg-muted", className)}
      {...props}
    >
      <div className="max-w-(--breakpoint-xl) w-full grid md:grid-cols-3 gap-8 px-4 py-8 divide-x">
        {props.children}
      </div>
    </div>
  );
}

function Feature({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature"
      className={cn("flex flex-col p-2", className)}
      {...props}
    />
  );
}

function FeatureHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-header"
      className={cn(
        "flex flex-col gap-0.5 [&>svg]:size-10 [&>svg]:text-pop [&>svg]:mb-2",
        className,
      )}
      {...props}
    />
  );
}

function FeatureTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="feature-title"
      className={cn("text-xl font-semibold", className)}
      {...props}
    />
  );
}

function FeatureDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="feature-description"
      className={cn("text-base text-muted-foreground", className)}
      {...props}
    />
  );
}

function FeatureContent({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="feature-content"
      className={cn("text-sm text-muted-foreground my-4 grow", className)}
      {...props}
    />
  );
}

function FeatureFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-footer"
      className={cn("self-start", className)}
      {...props}
    />
  );
}

export {
  FeatureGrid,
  FeatureGridHeader,
  FeatureGridContent,
  Feature,
  FeatureHeader,
  FeatureTitle,
  FeatureDescription,
  FeatureContent,
  FeatureFooter,
};
