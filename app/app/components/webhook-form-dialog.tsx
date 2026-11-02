import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { WebhookEventType } from "~/lib/types/webhook";

import { WebhooksIcon } from "~/icons";
import { WEBHOOK_EVENT_TYPES } from "~/lib/types/webhook";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";
import { Checkbox } from "~/ui/checkbox";
import { Copyable } from "~/ui/copyable";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";
import { Field, FieldError, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { InputSecret } from "~/ui/input-secret";
import { Spinner } from "~/ui/spinner";

import { webhookFormSchema } from "./webhook-form-dialog.schema";

export interface WebhookFormDialogProps {
  /** The signing secret of a just-created webhook. When set, the dialog swaps
   * the form for the reveal state (copy the secret, then Done). */
  createdSecret?: null | string;
  defaultEventTypes?: WebhookEventType[];
  defaultUrl?: string;
  /** A server-side error to surface inline (e.g. the url+project conflict). */
  error?: null | string;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  /** Host wires this to its own route action (this dialog does no fetching). */
  onSubmit: (values: { eventTypes: WebhookEventType[]; url: string }) => void;
  open: boolean;
  pending: boolean;
}

/**
 * Dumb, composable create/edit webhook modal. Takes its data + submit handler as
 * passthrough props — the host route owns the fetcher and wires `onSubmit` to its
 * own action (used from both the list page and the detail page). Validates with
 * the shared {@link webhookFormSchema} on the client for instant feedback; the
 * action re-validates server-side (source of truth).
 *
 * On a successful **create**, the host passes back `createdSecret` and the dialog
 * reveals the signing secret with a copy affordance (it stays retrievable on the
 * webhook's detail page, so this is a convenience, not a last-chance reveal).
 */
export function WebhookFormDialog({
  createdSecret,
  defaultEventTypes,
  defaultUrl,
  error,
  mode,
  onOpenChange,
  onSubmit,
  open,
  pending,
}: WebhookFormDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [eventTypes, setEventTypes] = useState<string[]>(
    defaultEventTypes ?? [],
  );
  const [clientErrors, setClientErrors] = useState<{
    eventTypes?: string;
    url?: string;
  }>({});

  // Re-seed the fields whenever the dialog (re)opens or the defaults change, so
  // an edit dialog reflects the row it was opened for and a create dialog resets.
  useEffect(() => {
    if (open) {
      setUrl(defaultUrl ?? "");
      setEventTypes(defaultEventTypes ?? []);
      setClientErrors({});
    }
  }, [open, defaultUrl, defaultEventTypes]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = webhookFormSchema.safeParse({ url, eventTypes });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setClientErrors({
        url: flat.url?.[0] ? t("webhooks.form.errors.url") : undefined,
        eventTypes: flat.eventTypes?.[0]
          ? t("webhooks.form.errors.eventTypes")
          : undefined,
      });
      return;
    }
    setClientErrors({});
    onSubmit(result.data);
  }

  const isCreated = Boolean(createdSecret);
  const allSelected = eventTypes.length === WEBHOOK_EVENT_TYPES.length;
  const someSelected = eventTypes.length > 0 && !allSelected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {isCreated ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("webhooks.form.created.title")}</DialogTitle>
              <DialogDescription>
                {t("webhooks.form.created.description")}
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="webhook-secret">
                {t("webhooks.form.fields.secret")}
              </FieldLabel>
              <div className="flex items-center gap-2">
                <InputSecret
                  id="webhook-secret"
                  name="webhook-secret"
                  readOnly
                  value={createdSecret ?? ""}
                  className="flex-1 font-mono"
                  revealLabel={t("common.show")}
                  hideLabel={t("common.hide")}
                />
                <Copyable
                  value={createdSecret ?? ""}
                  label={t("webhooks.form.copySecret")}
                  copiedLabel={t("webhooks.form.copiedSecret")}
                />
              </div>
            </Field>
            <DialogFooter>
              <DialogClose
                render={<Button>{t("common.done")}</Button>}
              />
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>
                {mode === "create"
                  ? t("webhooks.form.create.title")
                  : t("webhooks.form.edit.title")}
              </DialogTitle>
              <DialogDescription>
                {t("webhooks.form.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              {error ? (
                <Alert variant="destructive">
                  <WebhooksIcon />
                  <AlertTitle>{t("webhooks.form.errors.title")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="webhook-url">
                  {t("webhooks.form.fields.url")}
                </FieldLabel>
                <Input
                  id="webhook-url"
                  name="url"
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/webhooks/post-for-me"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (clientErrors.url) {
                      setClientErrors((prev) => ({ ...prev, url: undefined }));
                    }
                  }}
                  aria-invalid={clientErrors.url ? true : undefined}
                />
                <FieldError
                  errors={
                    clientErrors.url ? [{ message: clientErrors.url }] : undefined
                  }
                />
              </Field>

              <Field>
                <FieldLabel>{t("webhooks.form.fields.eventTypes")}</FieldLabel>
                <div className="overflow-hidden rounded-md border border-border">
                  {/* Select-all header, separated from the rows below. The
                      checkbox sits at the trailing edge, aligned with the rows. */}
                  <label className="flex cursor-pointer items-center justify-end gap-2.5 border-b border-border px-3 py-2 hover:bg-muted/40">
                    <span className="text-xs text-muted-foreground">
                      {t("webhooks.form.fields.selectAll")}
                    </span>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={(checked) => {
                        setEventTypes(checked ? [...WEBHOOK_EVENT_TYPES] : []);
                        setClientErrors((prev) => ({
                          ...prev,
                          eventTypes: undefined,
                        }));
                      }}
                    />
                  </label>
                  {/* Scrolls once the list outgrows the cap. */}
                  <div className="max-h-56 divide-y divide-border overflow-y-auto">
                    {WEBHOOK_EVENT_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/40"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                          {type}
                        </span>
                        <Checkbox
                          checked={eventTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            setEventTypes((prev) =>
                              checked
                                ? [...prev, type]
                                : prev.filter((value) => value !== type),
                            );
                            setClientErrors((prev) => ({
                              ...prev,
                              eventTypes: undefined,
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <FieldError
                  errors={
                    clientErrors.eventTypes
                      ? [{ message: clientErrors.eventTypes }]
                      : undefined
                  }
                />
              </Field>
            </div>

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="ghost">
                    {t("common.cancel")}
                  </Button>
                }
              />
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                {mode === "create"
                  ? t("webhooks.form.create.submit")
                  : t("webhooks.form.edit.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
