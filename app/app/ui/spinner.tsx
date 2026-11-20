import type { ComponentProps } from "react";

import { useTranslation } from "react-i18next";

import { LoadingIcon } from "~/icons";
import { cn } from "~/lib/utils";

function Spinner({ className, ...props }: ComponentProps<"svg">) {
  const { t } = useTranslation();

  return (
    <LoadingIcon
      role="status"
      aria-label={t("common.loading")}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
