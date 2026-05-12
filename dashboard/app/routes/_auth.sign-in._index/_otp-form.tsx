import { useState } from "react";
import { useNavigate } from "react-router";

import { cn } from "~/lib/utils";

import { useForm } from "~/hooks/use-form";

import { Button } from "~/ui/button";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";

import { PaperPlaneIcon, KeyIcon } from "~/components/icons";

export function OtpForm() {
  const { Form, isSubmitting, data } = useForm();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  const navigate = useNavigate();

  const disabled = isSubmitting;

  // Show success alert after email is sent
  if (step === "email" && data?.success) {
    setStep("code");
  }

  if (step === "code") {
    return (
      <Form
        className={cn("flex flex-col gap-6")}
        method="post"
        action="/sign-in/otp/verify"
      >
        <Alert variant="affirmative">
          <PaperPlaneIcon className="size-4 text-current" />
          <AlertTitle>One-time code sent!</AlertTitle>
          <AlertDescription>
            Check your email for a 6-digit code to complete sign in.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Enter your code</h1>
          <p className="text-muted-foreground">
            Enter the 6-digit code sent to {email}
          </p>
        </div>

        <div className="grid gap-6">
          <input type="hidden" name="email" value={email} />
          <div className="grid gap-3">
            <Label htmlFor="token">One-time code</Label>
            <Input
              type="text"
              id="token"
              name="token"
              placeholder="123456"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              autoComplete="one-time-code"
              className="text-center text-lg tracking-widest"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={disabled}
            loading={isSubmitting}
          >
            <KeyIcon />
            Verify Code
          </Button>

          <div className="text-center text-sm space-y-2">
            <button
              type="button"
              onClick={() => {
                navigate(0);
              }}
              className="text-primary hover:underline"
            >
              Didn&apos;t receive a code? Send again
            </button>
          </div>
        </div>
      </Form>
    );
  }

  return (
    <Form
      className={cn("flex flex-col gap-6")}
      method="post"
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget);
        const emailValue = formData.get("email") as string;
        if (emailValue) {
          setEmail(emailValue);
        }
      }}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign in with one-time code</h1>
        <p className="text-muted-foreground">
          We&apos;ll send a 6-digit code to your email
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            placeholder="hello@there.com"
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={disabled}
          loading={isSubmitting}
        >
          <PaperPlaneIcon />
          Send Code
        </Button>
      </div>

      <div className="text-center text-sm">
        Don&apos;t have an account? Just use one of the sign in methods above to
        create your account.
      </div>
    </Form>
  );
}
