import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "~/lib/utils";

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
}

export interface BadgeButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeButtonVariants> {
  asChild?: boolean;
}

export type BadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap justify-center border border-transparent font-medium focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        pop: "bg-pop text-white",
        destructive: "bg-destructive text-destructive-foreground",
        affirmative: "bg-affirmative text-foreground",
        highlight: "bg-highlight text-foreground",
        outline:
          "bg-transparent border border-border text-secondary-foreground",
      },
      appearance: {
        default: "",
        light: "",
        outline: "",
        ghost: "border-transparent bg-transparent",
      },
      disabled: {
        true: "opacity-50 pointer-events-none",
      },
      size: {
        lg: "rounded-md px-[0.5rem] h-7 min-w-7 gap-1.5 text-xs [&_svg]:size-3.5",
        md: "rounded-md px-[0.45rem] h-6 min-w-6 gap-1.5 text-xs [&_svg]:size-3.5 ",
        sm: "rounded-sm px-[0.325rem] h-5 min-w-5 gap-1 text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3",
        xs: "rounded-sm px-[0.25rem] h-4 min-w-4 gap-1 text-[0.625rem] leading-[0.5rem] [&_svg]:size-3",
      },
      shape: {
        default: "",
        circle: "rounded-full",
      },
    },
    compoundVariants: [
      /* Light */
      {
        variant: "primary",
        appearance: "light",
        className:
          "text-[var(--color-primary-pop,var(--color-blue-700))] bg-[var(--color-primary-soft,var(--color-blue-50))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]",
      },
      {
        variant: "secondary",
        appearance: "light",
        className:
          "bg-secondary dark:bg-secondary/50 text-secondary-foreground",
      },
      {
        variant: "pop",
        appearance: "light",
        className: "bg-pop/50 dark:bg-pop/20 text-white",
      },
      {
        variant: "affirmative",
        appearance: "light",
        className: "bg-affirmative/20 dark:bg-affirmative/10 text-foreground",
      },
      {
        variant: "highlight",
        appearance: "light",
        className: "bg-highlight/20 dark:bg-highlight/10 text-foreground",
      },
      {
        variant: "destructive",
        appearance: "light",
        className:
          "text-[var(--color-destructive-pop,var(--color-red-700))] bg-[var(--color-destructive-soft,var(--color-red-50))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]",
      },
      /* Outline */
      {
        variant: "primary",
        appearance: "outline",
        className:
          "text-[var(--color-primary-pop,var(--color-blue-700))] border-[var(--color-primary-soft,var(--color-blue-100))] bg-[var(--color-primary-soft,var(--color-blue-50))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:border-[var(--color-primary-soft,var(--color-blue-900))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]",
      },
      {
        variant: "pop",
        appearance: "outline",
        className:
          "bg-pop/10 dark:bg-pop/5 border-pop/30 dark:border-pop/20 text-white",
      },
      {
        variant: "affirmative",
        appearance: "outline",
        className:
          "bg-affirmative/10 dark:bg-affirmative/5 border-affirmative/30 dark:border-affirmative/20 text-foreground",
      },
      {
        variant: "highlight",
        appearance: "outline",
        className:
          "bg-highlight/10 dark:bg-highlight/5 border-highlight/30 dark:border-highlight/20 text-foreground",
      },
      {
        variant: "destructive",
        appearance: "outline",
        className:
          "text-[var(--color-destructive-pop,var(--color-red-700))] border-[var(--color-destructive-soft,var(--color-red-100))] bg-[var(--color-destructive-soft,var(--color-red-50))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:border-[var(--color-destructive-soft,var(--color-red-900))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]",
      },
      /* Ghost */
      {
        variant: "primary",
        appearance: "ghost",
        className: "text-primary",
      },
      {
        variant: "secondary",
        appearance: "ghost",
        className: "text-secondary-foreground",
      },
      {
        variant: "pop",
        appearance: "ghost",
        className: "text-white",
      },
      {
        variant: "affirmative",
        appearance: "ghost",
        className: "text-affirmative",
      },
      {
        variant: "highlight",
        appearance: "ghost",
        className: "text-highlight",
      },
      {
        variant: "destructive",
        appearance: "ghost",
        className: "text-destructive",
      },

      { size: "lg", appearance: "ghost", className: "px-0" },
      { size: "md", appearance: "ghost", className: "px-0" },
      { size: "sm", appearance: "ghost", className: "px-0" },
      { size: "xs", appearance: "ghost", className: "px-0" },
    ],
    defaultVariants: {
      variant: "pop",
      appearance: "default",
      size: "md",
      shape: "circle",
    },
  },
);

const badgeButtonVariants = cva(
  "cursor-pointer transition-all inline-flex items-center justify-center leading-none size-3.5 [&>svg]:opacity-100! [&>svg]:size-3.5! p-0 rounded-md -me-0.5 opacity-60 hover:opacity-100",
  {
    variants: {
      variant: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  appearance,
  shape,
  asChild = false,
  disabled,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(
        badgeVariants({ variant, size, appearance, shape, disabled }),
        className,
      )}
      {...props}
    />
  );
}

function BadgeButton({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof badgeButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";
  return (
    <Comp
      data-slot="badge-button"
      className={cn(badgeButtonVariants({ variant, className }))}
      role="button"
      {...props}
    />
  );
}

function BadgeDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge-dot"
      className={cn(
        "size-1.5 rounded-full bg-[currentColor] opacity-75",
        className,
      )}
      {...props}
    />
  );
}

export { Badge, BadgeButton, BadgeDot, badgeVariants };
