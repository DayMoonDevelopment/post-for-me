import type { FetcherWithComponents } from "react-router";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useHydrated } from "~/hooks/use-hydrated";
import { Button } from "~/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { Spinner } from "~/ui/spinner";
import { Status, StatusPanel } from "~/ui/status";

import type { LoginActionData } from "../route.action";

import { loginEmailSchema } from "../login.schema";

export function EmailStep({
  fetcher,
  error,
  pending,
}: {
  error?: string;
  fetcher: FetcherWithComponents<LoginActionData>;
  pending: boolean;
}) {
  const { t } = useTranslation();
  // Block submission until React has hydrated — otherwise a pre-hydration click
  // does a full-page native POST to /login?index instead of a fetcher submit.
  const hydrated = useHydrated();
  // The same schema the action enforces, run here first for instant feedback.
  // `noValidate` hands client validation to zod instead of the browser so the
  // two sides share one definition of "valid".
  const [clientError, setClientError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const fields = new FormData(event.currentTarget);
    const result = loginEmailSchema.safeParse({ email: fields.get("email") });
    if (!result.success) {
      event.preventDefault();
      setClientError(t("login.errors.invalidEmail"));
      return;
    }
    setClientError(null);
  }

  const message = clientError ?? error;

  return (
    <fetcher.Form
      method="post"
      className="px-1"
      onSubmit={handleSubmit}
      noValidate
    >
      <FieldGroup>
        <div className={"flex flex-col items-start gap-1"}>
          <h1 className="text-4xl font-bold text-balance">
            {t("login.email.heading")}
          </h1>
          <p className="text-balance text-muted-foreground">
            {t("login.email.subheading")}
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="email">{t("login.email.emailLabel")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder={t("login.email.emailPlaceholder")}
            autoComplete="email"
            aria-invalid={message ? true : undefined}
            onChange={() => clientError && setClientError(null)}
          />
        </Field>
        {message ? (
          <p className="text-center text-sm text-destructive" role="alert">
            {message}
          </p>
        ) : null}
        <Field>
          <Button
            type="submit"
            name="intent"
            value="request"
            disabled={pending || !hydrated}
          >
            <Status value={pending ? "busy" : "idle"}>
              <StatusPanel value="idle">{t("login.email.submit")}</StatusPanel>
              <StatusPanel value="busy">
                <Spinner />
                {t("login.email.submitPending")}
              </StatusPanel>
            </Status>
          </Button>
        </Field>
        <FieldDescription className="text-center text-balance">
          {t("login.email.createAccountHint")}
        </FieldDescription>
      </FieldGroup>
    </fetcher.Form>
  );
}
