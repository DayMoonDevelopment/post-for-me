import { useState } from "react";
import { Link } from "react-router";

import { cn } from "~/lib/utils";

import { useForm } from "~/hooks/use-form";

import { Button } from "~/ui/button";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";

import {
  // GoogleIcon,
  // GitHubIcon,
  MagicWandIcon,
} from "~/components/icons";

import { EmailAlert } from "./_email-alert";

export function SignInForm() {
  const { Form, isSubmitting, data } = useForm();
  const [selected, setSelected] = useState<
    "email" | "google" | "github" | "password" | "magiclink" | null
  >(null);

  const disabled = isSubmitting;
  const loading = isSubmitting ? selected : null;

  // Show email alert for magic link success
  if (
    selected === "magiclink" &&
    data?.success &&
    data?.authType === "magiclink"
  ) {
    return <EmailAlert />;
  }

  return (
    <Form className={cn("flex flex-col gap-6")} method="post">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
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

        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          name="auth_type"
          value="password"
          className="w-full"
          disabled={disabled}
          loading={loading === "password"}
          onClick={() => setSelected("password")}
        >
          Sign in
        </Button>

        <div className="text-right text-sm">
          <Link
            to="/sign-in/forgot-password"
            className="text-primary hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            or
          </span>
        </div>

        <Button asChild variant="secondary" className="w-full">
          <Link to="/sign-in">
            <MagicWandIcon className="mr-2 h-4 w-4" />
            Sign in with Magic Link
          </Link>
        </Button>
      </div>

      <div className="text-center text-sm">
        {`Don't have an account? Just use one of the sign in methods above to
        create your account.`}
      </div>
    </Form>
  );
}
