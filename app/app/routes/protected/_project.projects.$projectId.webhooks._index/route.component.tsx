import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLoaderData } from "react-router";

import type { WebhookEventType, WebhookSummary } from "~/lib/types/webhook";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { SubscriptionRequired } from "~/components/subscription-required";
import { WebhookFormDialog } from "~/components/webhook-form-dialog";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { AddIcon, WebhooksIcon } from "~/icons";
import { isActionError } from "~/lib/action-result";
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

import { WebhooksTable } from "./components/webhooks-table";

/** The `{ ok, secret? }` shape a successful create/update returns. */
type FormResult = { ok: true; secret?: string; webhookId?: string };

function isFormSuccess(value: unknown): value is FormResult {
  return typeof value === "object" && value !== null && "ok" in value;
}

/**
 * Webhooks list page (PFM-707). Full-bleed header + "Create webhook" CTA, then
 * either an empty state or the webhooks table. Create/edit run through the shared
 * {@link WebhookFormDialog} (its own fetcher, so its inline error — e.g. the
 * url+project conflict — and the one-time secret reveal are read from the
 * result); delete runs through a {@link ConfirmDialog} on a second fetcher that
 * toasts failures.
 */
export function Component() {
  const { webhooks, projectId, unavailable, reason, teamId } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation();

  // Form fetcher (create/edit): NO error toast — the dialog surfaces the error
  // inline (and reveals the secret on create).
  const formFetcher = useFetcher();
  // Row fetcher (delete): toast failures.
  const deleteFetcher = useFetcher();
  useActionErrorToast(deleteFetcher);

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<WebhookSummary | null>(null);
  const [createdSecret, setCreatedSecret] = useState<null | string>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebhookSummary | null>(null);

  const formPending = formFetcher.state !== "idle";
  const deletePending = deleteFetcher.state !== "idle";

  // React to a settled form submit: reveal the secret on create, else close.
  useEffect(() => {
    if (formFetcher.state !== "idle" || !formFetcher.data) return;
    if (isActionError(formFetcher.data)) return; // stay open; error shows inline
    if (isFormSuccess(formFetcher.data) && formFetcher.data.secret) {
      setCreatedSecret(formFetcher.data.secret);
    } else {
      setFormOpen(false);
    }
  }, [formFetcher.state, formFetcher.data]);

  // Close the delete dialog once its mutation succeeds.
  useEffect(() => {
    if (
      deleteFetcher.state === "idle" &&
      deleteFetcher.data &&
      !isActionError(deleteFetcher.data)
    ) {
      setDeleteTarget(null);
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  const formError =
    formFetcher.data && isActionError(formFetcher.data)
      ? formFetcher.data.error
      : null;

  function openCreate() {
    setMode("create");
    setEditing(null);
    setCreatedSecret(null);
    setFormOpen(true);
  }

  function openEdit(webhook: WebhookSummary) {
    setMode("edit");
    setEditing(webhook);
    setCreatedSecret(null);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) {
      setCreatedSecret(null);
      setEditing(null);
    }
  }

  function submitForm(values: { eventTypes: WebhookEventType[]; url: string }) {
    const body = new FormData();
    body.set("intent", mode === "create" ? "create" : "update");
    if (editing) body.set("id", editing.id);
    body.set("url", values.url);
    for (const type of values.eventTypes) body.append("eventTypes", type);
    formFetcher.submit(body, { method: "post" });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteFetcher.submit(
      { intent: "delete", id: deleteTarget.id },
      { method: "post" },
    );
  }

  const showEmptyState = !unavailable && webhooks.length === 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("webhooks.pageTitle")}
        </h1>
        {!showEmptyState ? (
          <Button
            onClick={openCreate}
            disabled={unavailable}
            className="shrink-0"
          >
            <AddIcon />
            {t("webhooks.create")}
          </Button>
        ) : null}
      </div>

      {unavailable ? (
        <SubscriptionRequired
          namespace="webhooks.unavailable"
          reason={reason ?? "error"}
          teamId={teamId}
        />
      ) : showEmptyState ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WebhooksIcon />
            </EmptyMedia>
            <EmptyTitle>{t("webhooks.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("webhooks.empty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <AddIcon />
              {t("webhooks.create")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <WebhooksTable
          webhooks={webhooks}
          projectId={projectId}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <WebhookFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        mode={mode}
        defaultUrl={editing?.url}
        defaultEventTypes={editing?.eventTypes}
        pending={formPending}
        error={formError}
        createdSecret={createdSecret}
        onSubmit={submitForm}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => (open ? undefined : setDeleteTarget(null))}
        title={t("webhooks.delete.title")}
        description={t("webhooks.delete.description")}
        confirmLabel={t("webhooks.delete.confirm")}
        destructive
        pending={deletePending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
