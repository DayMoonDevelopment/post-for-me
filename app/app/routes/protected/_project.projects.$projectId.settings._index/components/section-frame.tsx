import type * as React from "react";

import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import { Spinner } from "~/ui/spinner";

/**
 * The chrome-neutral wrapper every project-config section renders: a heading
 * (title + description) above the section's form. The OUTER frame is the
 * consumer's — a `Card` on the settings page, a `ModalSlide` body in the setup
 * modal — so the same section drops into either.
 */
export function ProjectConfigSection({
  title,
  description,
  className,
  children,
}: {
  children: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <section
      data-slot="project-config-section"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-medium text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-sm/relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The section's action row, styled as a pinned footer with a full-bleed top
 * separator — matching the framed modal footers (the onboarding / confirm-dialog
 * look). These sections render inside the simple-layout `SectionEditDialog`
 * (`p-6`), so the negative inset pulls the divider out to the dialog edges and
 * the row flush to the bottom.
 */
export function SectionFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 -mb-6 mt-2 flex justify-end gap-2 border-t border-border px-6 py-4">
      {children}
    </div>
  );
}

/**
 * A submit button with the shared "Save" label + pending spinner. Pass
 * `disabled` to gate it on the section's readiness (e.g. "has anything
 * changed?") — the app-wide default is to keep actions visible but disabled
 * until they're ready to interact, never to hide them.
 */
export function SaveButton({
  pending,
  disabled,
  children,
}: {
  children?: React.ReactNode;
  disabled?: boolean;
  pending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? <Spinner /> : null}
      {children ?? t("projectSettings.save")}
    </Button>
  );
}
