import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckIcon } from "~/icons";
import { Button } from "~/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";
import { Field, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { Spinner } from "~/ui/spinner";

/**
 * Dumb rename dialog for an API key — a single name field posting to the host's
 * action via `onSubmit`. Save is disabled until the name is non-empty and
 * actually changed (the "disable until ready" convention).
 */
export function ApiKeyRenameDialog({
  open,
  onOpenChange,
  defaultName,
  pending,
  onSubmit,
}: {
  defaultName: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  open: boolean;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  const canSave = name.trim() !== "" && name.trim() !== defaultName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("apiKeys.rename.title")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Field>
              <FieldLabel htmlFor="api-key-rename">
                {t("apiKeys.rename.nameLabel")}
              </FieldLabel>
              <Input
                id="api-key-rename"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                autoFocus
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
            <Button type="submit" disabled={pending || !canSave}>
              {pending ? <Spinner /> : <CheckIcon />}
              {t("apiKeys.rename.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
