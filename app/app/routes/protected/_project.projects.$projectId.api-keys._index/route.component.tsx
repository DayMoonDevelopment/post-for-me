import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLoaderData } from "react-router";

import type { ApiKey } from "~/lib/types/api-key";

import { ApiKeyCreateDialog } from "~/components/api-key-create-dialog";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { AddIcon, ApiKeysIcon, WarningIcon } from "~/icons";
import { isActionError } from "~/lib/action-result";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";

import type { loader } from "./route.loader";

import { ApiKeyRenameDialog } from "./components/api-key-rename-dialog";
import { ApiKeysTable } from "./components/api-keys-table";

type CreateResult = { ok: true; secret?: string };

function isCreateSuccess(value: unknown): value is CreateResult {
  return typeof value === "object" && value !== null && "ok" in value;
}

/**
 * API Keys page (PFM-663). Header + "Create API key" CTA, then either an empty
 * state or the keys table. Create runs through the shared
 * {@link ApiKeyCreateDialog} (its own fetcher, so the one-time secret is read
 * from the result and revealed); rename + delete run through a second fetcher
 * that toasts failures. If the keys backend is unavailable, an inline notice
 * replaces the actions.
 */
export function Component() {
  const { keys, unavailable } = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  const createFetcher = useFetcher();
  const rowFetcher = useFetcher();
  useActionErrorToast(createFetcher);
  useActionErrorToast(rowFetcher);

  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<null | string>(null);
  const [renameTarget, setRenameTarget] = useState<ApiKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  const createPending = createFetcher.state !== "idle";
  const rowPending = rowFetcher.state !== "idle";

  // Reveal the secret once the create lands (stay open); errors toast + stay open.
  useEffect(() => {
    if (createFetcher.state !== "idle" || !createFetcher.data) return;
    if (isActionError(createFetcher.data)) return;
    if (isCreateSuccess(createFetcher.data) && createFetcher.data.secret) {
      setCreatedSecret(createFetcher.data.secret);
    }
  }, [createFetcher.state, createFetcher.data]);

  // Close rename/delete dialogs once their mutation succeeds.
  useEffect(() => {
    if (
      rowFetcher.state === "idle" &&
      rowFetcher.data &&
      !isActionError(rowFetcher.data)
    ) {
      setRenameTarget(null);
      setDeleteTarget(null);
    }
  }, [rowFetcher.state, rowFetcher.data]);

  function openCreate() {
    setCreatedSecret(null);
    setCreateOpen(true);
  }

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open) setCreatedSecret(null);
  }

  function submitCreate(values: { name?: string }) {
    createFetcher.submit(
      { intent: "create", name: values.name ?? "" },
      { method: "post" },
    );
  }

  function submitRename(name: string) {
    if (!renameTarget) return;
    rowFetcher.submit(
      { intent: "rename", id: renameTarget.id, name },
      { method: "post" },
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    rowFetcher.submit(
      { intent: "delete", id: deleteTarget.id },
      { method: "post" },
    );
  }

  const showEmptyState = keys.length === 0 && !unavailable;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("apiKeys.pageTitle")}
        </h1>
        {!showEmptyState ? (
          <Button
            onClick={openCreate}
            disabled={unavailable}
            className="shrink-0"
          >
            <AddIcon />
            {t("apiKeys.create.submit")}
          </Button>
        ) : null}
      </div>

      {unavailable ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>{t("apiKeys.unavailable.title")}</AlertTitle>
          <AlertDescription>
            {t("apiKeys.unavailable.description")}
          </AlertDescription>
        </Alert>
      ) : null}

      {showEmptyState ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ApiKeysIcon />
            </EmptyMedia>
            <EmptyTitle>{t("apiKeys.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {t("apiKeys.empty.description")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <AddIcon />
              {t("apiKeys.create.submit")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : keys.length > 0 ? (
        <ApiKeysTable
          apiKeys={keys}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
        />
      ) : null}

      <ApiKeyCreateDialog
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        pending={createPending}
        createdSecret={createdSecret}
        onSubmit={submitCreate}
      />

      <ApiKeyRenameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => (open ? undefined : setRenameTarget(null))}
        defaultName={renameTarget?.name ?? ""}
        pending={rowPending}
        onSubmit={submitRename}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => (open ? undefined : setDeleteTarget(null))}
        title={t("apiKeys.delete.title")}
        description={t("apiKeys.delete.description")}
        confirmLabel={t("apiKeys.delete.confirm")}
        destructive
        pending={rowPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
