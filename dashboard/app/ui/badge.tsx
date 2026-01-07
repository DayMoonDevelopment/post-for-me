import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center border font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        affirmative:
          "border-affirmative/35 bg-affirmative/10 text-affirmative [a&]:hover:bg-affirmative/20 focus-visible:ring-affirmative/20 dark:focus-visible:ring-affirmative/40",
        highlight:
          "border-transparent bg-highlight text-white [a&]:hover:bg-highlight/90 focus-visible:ring-highlight/20 dark:focus-visible:ring-highlight/40 dark:bg-highlight/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
      shape: {
        pill: "rounded-full",
      },
      size: {
        default: "px-2 py-0.5 text-xs [&>svg]:size-3",
        sm: "px-1 py-0.25 text-[0.5rem] leading-3 [&>svg]:size-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "pill",
      size: "default",
    },
  }
);

function Badge({
  className,
  variant,
  shape,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, shape, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
