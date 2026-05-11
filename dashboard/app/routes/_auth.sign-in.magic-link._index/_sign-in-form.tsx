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
    "email" | "google" | "github" | null
  >(null);

  const disabled = isSubmitting;
  const loading = isSubmitting ? selected : null;

  if (selected === "email" && data?.success) {
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

        <Button
          type="submit"
          className="w-full"
          disabled={disabled}
          loading={loading === "email"}
          onClick={() => setSelected("email")}
        >
          Sign in with Magic Link <MagicWandIcon />
        </Button>

        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            or
          </span>
        </div>

        <div className="grid gap-3">
          <Button asChild variant="secondary" className="w-full">
            <Link to="/sign-in">Sign in with One-Time Code</Link>
          </Button>
        </div>
      </div>

      <div className="text-center text-sm">
        {`Don't have an account? Just use one of the sign in methods above to
        create your account.`}
      </div>
    </Form>
  );
}
