import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router";

import type {
  Webhook,
  WebhookEventListParams,
  WebhookEventListResult,
  WebhookEventType,
} from "~/lib/types/webhook";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { SubscriptionRequired } from "~/components/subscription-required";
import { WebhookFormDialog } from "~/components/webhook-form-dialog";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { DeleteIcon, EditIcon, WebhooksIcon } from "~/icons";
import { isActionError } from "~/lib/action-result";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/card";
import { Copyable } from "~/ui/copyable";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";

import type { loader } from "./route.loader";

import { WebhookEventsGrid } from "./components/webhook-events-grid";
import { WebhookSecretSection } from "./components/webhook-secret-section";
import {
  parseEventListParams,
  serializeEventListParams,
} from "./schemas/events-list-params";

/**
 * Webhook detail page (PFM-709). Reads the webhook config (via the API) + its
 * delivery events (via Supabase); when the API is unavailable (no subscription /
 * misconfig) it renders an in-page notice instead. The main view is split out so
 * hooks run only with non-null data.
 */
export function Component() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.unavailable || !loaderData.webhook || !loaderData.events) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <SubscriptionRequired
          namespace="webhooks.unavailable"
          reason={loaderData.reason ?? "error"}
          teamId={loaderData.teamId}
        />
      </div>
    );
  }

  return (
    <WebhookDetailView
      webhook={loaderData.webhook}
      events={loaderData.events}
      projectId={loaderData.projectId}
    />
  );
}

/**
 * The webhook config (URL · event types · revealable signing secret) with an
 * edit action, the server-driven delivery-events grid, and a danger zone. Edit
 * runs through the shared {@link WebhookFormDialog} (revalidates on save); delete
 * redirects back to the list.
 */
function WebhookDetailView({
  webhook,
  events,
  projectId,
}: {
  events: WebhookEventListResult;
  projectId: string;
  webhook: Webhook;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  // Drive the events grid from the pending navigation URL when one is in flight
  // (optimistic sort/page), falling back to the committed URL when idle.
  const eventParams = useMemo(
    () =>
      parseEventListParams(
        new URLSearchParams(navigation.location?.search ?? location.search),
      ),
    [navigation.location?.search, location.search],
  );

  const editFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  useActionErrorToast(deleteFetcher);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editPending = editFetcher.state !== "idle";
  const deletePending = deleteFetcher.state !== "idle";

  // Close the edit dialog once its update lands (the loader revalidates the card).
  useEffect(() => {
    if (
      editFetcher.state === "idle" &&
      editFetcher.data &&
      !isActionError(editFetcher.data)
    ) {
      setEditOpen(false);
    }
  }, [editFetcher.state, editFetcher.data]);

  const editError =
    editFetcher.data && isActionError(editFetcher.data)
      ? editFetcher.data.error
      : null;

  const updateEventParams = useCallback(
    (next: WebhookEventListParams) => {
      setSearchParams(serializeEventListParams(next), {
        preventScrollReset: true,
      });
    },
    [setSearchParams],
  );

  function submitEdit(values: { eventTypes: WebhookEventType[]; url: string }) {
    const body = new FormData();
    body.set("intent", "update");
    body.set("url", values.url);
    for (const type of values.eventTypes) body.append("eventTypes", type);
    editFetcher.submit(body, { method: "post" });
  }

  const hasEventFilter = Boolean(
    eventParams.type?.length || eventParams.status?.length,
  );
  const showEventsEmpty =
    events.total === 0 && !hasEventFilter && navigation.state === "idle";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Button
            variant="link"
            onClick={() => navigate(`/projects/${projectId}/webhooks`)}
            className="h-auto justify-start p-0 text-sm text-muted-foreground"
          >
            {t("webhooks.detail.back")}
          </Button>
          <h1 className="truncate font-heading text-2xl font-semibold text-foreground">
            {webhook.url}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => setEditOpen(true)}
          className="shrink-0"
        >
          <EditIcon />
          {t("common.edit")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("webhooks.detail.configTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("webhooks.detail.url")}
            </span>
            <Copyable
              value={webhook.url}
              label={t("webhooks.detail.copyUrl")}
              className="max-w-full justify-start"
            >
              <span className="truncate">{webhook.url}</span>
            </Copyable>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("webhooks.detail.eventTypes")}
            </span>
            <div className="flex flex-wrap gap-1">
              {webhook.eventTypes.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  size="xs"
                  className="font-mono"
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <WebhookSecretSection secretKey={webhook.secretKey} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          {t("webhooks.events.title")}
        </h2>
        {showEventsEmpty ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WebhooksIcon />
              </EmptyMedia>
              <EmptyTitle>{t("webhooks.events.empty.title")}</EmptyTitle>
              <EmptyDescription>
                {t("webhooks.events.empty.description")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <WebhookEventsGrid
            events={events.events}
            total={events.total}
            params={eventParams}
            onParamsChange={updateEventParams}
          />
        )}
      </section>

      <section className="flex flex-col items-start gap-3 rounded-xl border border-destructive/10 bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-sm font-semibold text-destructive">
            {t("webhooks.detail.dangerTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("webhooks.detail.dangerDescription")}
          </p>
        </div>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <DeleteIcon />
          {t("webhooks.detail.delete")}
        </Button>
      </section>

      <WebhookFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultUrl={webhook.url}
        defaultEventTypes={webhook.eventTypes}
        pending={editPending}
        error={editError}
        onSubmit={submitEdit}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("webhooks.delete.title")}
        description={t("webhooks.delete.description")}
        confirmLabel={t("webhooks.delete.confirm")}
        destructive
        pending={deletePending}
        onConfirm={() =>
          deleteFetcher.submit({ intent: "delete" }, { method: "post" })
        }
      />
    </div>
  );
}
