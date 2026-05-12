import { cva } from "class-variance-authority";
import { useEffect, useState } from "react";
import { Link as ReactRouterLink, type LinkProps } from "react-router";

import { cn } from "~/lib/utils";

const linkStyles = cva("", {
  variants: {
    highlight: {
      false: "",
      true: "text-primary hover:underline",
    },
  },
  defaultVariants: {
    highlight: false,
  },
});

function isInternalUrl(to: string, currentOrigin: string): boolean {
  try {
    if (to.startsWith("/") || to.startsWith("#") || to.startsWith("?")) {
      return true;
    }

    if (to.startsWith("mailto:") || to.startsWith("tel:")) {
      return true;
    }

    const url = new URL(to);
    const currentUrl = new URL(currentOrigin);

    if (url.hostname === currentUrl.hostname) {
      return true;
    }

    const withoutWww = (hostname: string) => hostname.replace(/^www\./, "");
    if (withoutWww(url.hostname) === withoutWww(currentUrl.hostname)) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export const Link = ({
  to,
  target,
  className,
  highlight,
  ...props
}: LinkProps & { highlight?: boolean }) => {
  const [currentOrigin, setCurrentOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const shouldOpenInNewTab =
    typeof to === "string" && !isInternalUrl(to, currentOrigin);

  return (
    <ReactRouterLink
      to={to}
      target={shouldOpenInNewTab ? "_blank" : target}
      className={cn(linkStyles({ highlight }), className)}
      {...props}
    />
  );
};
