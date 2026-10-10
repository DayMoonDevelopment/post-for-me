import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckIcon, WarningIcon } from "~/icons";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";
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
import { Field, FieldDescription, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { InputSecret } from "~/ui/input-secret";
import { Spinner } from "~/ui/spinner";

export interface ApiKeyCreateDialogProps {
  /** The full key of a just-created key. When set, the dialog swaps the form for
   * the one-time reveal (copy it now — it can't be shown again). */
  createdSecret?: null | string;
  error?: null | string;
  onOpenChange: (open: boolean) => void;
  /** Host wires this to its own route action (this dialog does no fetching). */
  onSubmit: (values: { name?: string }) => void;
  open: boolean;
  pending: boolean;
}

/**
 * Dumb, composable "create an API key + reveal it once" modal. Takes its submit
 * handler + result as passthrough props so it can be driven by the API-keys page
 * OR the onboarding step (PFM-647/662), each wiring `onSubmit` to its own action.
 *
 * The generated key is shown exactly once: after a successful create the host
 * passes `createdSecret` and the dialog switches to a copy-now reveal with a
 * can't-see-it-again warning (Unkey only stores a hash).
 */
export function ApiKeyCreateDialog({
  createdSecret,
  error,
  onOpenChange,
  onSubmit,
  open,
  pending,
}: ApiKeyCreateDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  // Reset the name field each time the dialog opens fresh.
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ name: name.trim() || undefined });
  }

  const isCreated = Boolean(createdSecret);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {isCreated ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("apiKeys.create.createdTitle")}</DialogTitle>
              <DialogDescription>
                {t("apiKeys.create.createdDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <Alert variant="warning">
                <WarningIcon />
                <AlertTitle>{t("apiKeys.create.warningTitle")}</AlertTitle>
                <AlertDescription>
                  {t("apiKeys.create.warningDescription")}
                </AlertDescription>
              </Alert>

              <Field>
                <FieldLabel htmlFor="api-key-secret">
                  {t("apiKeys.create.secretLabel")}
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <InputSecret
                    id="api-key-secret"
                    name="api-key-secret"
                    readOnly
                    value={createdSecret ?? ""}
                    className="flex-1 font-mono"
                    revealLabel={t("common.show")}
                    hideLabel={t("common.hide")}
                  />
                  <Copyable
                    value={createdSecret ?? ""}
                    label={t("apiKeys.create.copy")}
                    copiedLabel={t("apiKeys.create.copied")}
                  />
                </div>
              </Field>
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button>{t("common.done")}</Button>}
              />
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("apiKeys.create.title")}</DialogTitle>
              <DialogDescription>
                {t("apiKeys.create.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              {error ? (
                <Alert variant="destructive">
                  <WarningIcon />
                  <AlertTitle>{t("apiKeys.create.errorTitle")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="api-key-name">
                  {t("apiKeys.create.nameLabel")}
                </FieldLabel>
                <Input
                  id="api-key-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("apiKeys.create.namePlaceholder")}
                  maxLength={120}
                />
                <FieldDescription>
                  {t("apiKeys.create.nameHint")}
                </FieldDescription>
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
                {pending ? <Spinner /> : <CheckIcon />}
                {t("apiKeys.create.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
