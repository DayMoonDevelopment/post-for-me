import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { type FetcherWithComponents, useFetcher } from "react-router";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "~/ui/input-otp";
import { type StatusState } from "~/ui/status";

import type { LoginActionData } from "../route.action";

import { VerifyStatus } from "./verify-status";

export function VerifyStep({
  fetcher,
  email,
  error,
  pending,
  code,
  onCodeChange,
  otpRef,
  onUseDifferentEmail,
}: {
  code: string;
  email?: string;
  error?: string;
  fetcher: FetcherWithComponents<LoginActionData>;
  onCodeChange: (code: string) => void;
  onUseDifferentEmail: () => void;
  otpRef: React.Ref<HTMLInputElement>;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const resend = useFetcher<LoginActionData>();
  const formRef = React.useRef<HTMLFormElement>(null);

  // The verify fetcher drives the indicator: submitting = checking the code; a
  // "done" step in the response = verified, held briefly before navigation.
  const status: StatusState =
    fetcher.state === "submitting"
      ? "busy"
      : fetcher.data?.step === "done"
        ? "done"
        : "idle";

  return (
    <div className="px-1">
      <FieldGroup>
        <div className={"flex flex-col gap-1 text-center"}>
          <h1 className="text-2xl font-bold">{t("login.verify.heading")}</h1>
          <p className="text-balance text-muted-foreground">
            <Trans
              i18nKey="login.verify.subheading"
              values={{ email }}
              components={{ strong: <strong /> }}
            />
          </p>
        </div>

        <fetcher.Form method="post" ref={formRef} className="contents">
          <input type="hidden" name="email" value={email ?? ""} />
          <input type="hidden" name="intent" value="verify" />
          <Field>
            <FieldLabel htmlFor="code" className="sr-only">
              {t("login.verify.codeLabel")}
            </FieldLabel>
            <div className="flex justify-center">
              <InputOTP
                id="code"
                name="code"
                maxLength={6}
                ref={otpRef}
                value={code}
                onChange={onCodeChange}
                onComplete={() => formRef.current?.requestSubmit()}
                disabled={pending || status === "done"}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="size-10 text-sm" />
                  <InputOTPSlot index={1} className="size-10 text-sm" />
                  <InputOTPSlot index={2} className="size-10 text-sm" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="size-10 text-sm" />
                  <InputOTPSlot index={4} className="size-10 text-sm" />
                  <InputOTPSlot index={5} className="size-10 text-sm" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </Field>
          {error ? (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Field>
            <div
              aria-live="polite"
              className="flex min-h-6 items-center justify-center"
            >
              <VerifyStatus status={status} />
            </div>
          </Field>
        </fetcher.Form>
        <resend.Form method="post" className="contents">
          <input type="hidden" name="email" value={email ?? ""} />
          <FieldDescription className="text-center" aria-live="polite">
            {resend.state !== "idle" ? (
              t("login.verify.resendPending")
            ) : resend.data ? (
              t("login.verify.resendDone")
            ) : (
              <>
                {t("login.verify.resendPrompt")}{" "}
                <button
                  type="submit"
                  name="intent"
                  value="request"
                  className="underline underline-offset-2"
                >
                  {t("login.verify.resend")}
                </button>
              </>
            )}{" "}
            ·{" "}
            <button
              type="button"
              onClick={onUseDifferentEmail}
              className="underline underline-offset-2"
            >
              {t("login.verify.useDifferentEmail")}
            </button>
          </FieldDescription>
        </resend.Form>
      </FieldGroup>
    </div>
  );
}
