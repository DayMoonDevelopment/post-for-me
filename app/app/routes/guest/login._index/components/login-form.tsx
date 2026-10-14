import * as React from "react";
import { Trans } from "react-i18next";
import { useFetcher, useNavigate } from "react-router";

import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/ui/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "~/ui/carousel";
import { FieldDescription, FieldGroup } from "~/ui/field";

import type { LoginActionData } from "../route.action";

import { EmailStep } from "./email-step";
import { HeroPanel } from "./hero-panel";
import { VerifyStep } from "./verify-step";

const SLIDE_MS = 350;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // The whole flow runs through one fetcher: submissions are async (no
  // navigation, no `?index` in the address bar) and the step state lives
  // in memory only — every page load is its own standalone login session.
  const login = useFetcher<LoginActionData>();
  const navigate = useNavigate();

  const serverStep = login.data?.step ?? "email";
  const email =
    login.data && "email" in login.data ? login.data.email : undefined;

  // "Use a different email" slides back without a server roundtrip; any new
  // submission result snaps us back to the server's step.
  const [wentBack, setWentBack] = React.useState(false);
  React.useEffect(() => setWentBack(false), [login.data]);
  const step = wentBack ? "email" : serverStep;

  // Verified: hold the "done" indicator briefly, then navigate. The session
  // cookies are already set on the action response, so "/" loads authenticated.
  React.useEffect(() => {
    if (login.data?.step !== "done") return;
    const t = window.setTimeout(() => navigate("/"), 700);
    return () => window.clearTimeout(t);
  }, [login.data, navigate]);

  const pendingIntent =
    login.state !== "idle"
      ? String(login.formData?.get("intent") ?? "")
      : null;

  const [api, setApi] = React.useState<CarouselApi>();
  const slideIndex = step === "email" ? 0 : 1;
  // startIndex must stay frozen at its mount-time value: if it changed with
  // the step, embla would re-initialize AT the target slide (an instant
  // snap) instead of animating scrollTo.
  const [initialSlide] = React.useState(slideIndex);
  React.useEffect(() => {
    api?.scrollTo(slideIndex);
  }, [api, slideIndex]);

  // Controlled code so a failed verify clears it; refocus after the slide.
  const [code, setCode] = React.useState("");
  const otpRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (login.data?.step === "verify" && login.data.error) setCode("");
  }, [login.data]);
  React.useEffect(() => {
    if (step !== "verify") return;
    const t = setTimeout(() => otpRef.current?.focus(), SLIDE_MS);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="flex flex-col justify-center py-6 md:min-h-[560px] md:py-10">
            <FieldGroup>
              <Carousel
                setApi={setApi}
                opts={{ startIndex: initialSlide, watchDrag: false }}
              >
                {/* ms-0 cancels the shadcn gutter so slides are full-bleed;
                    px lives inside each item so content keeps its inset while
                    the carousel viewport spans the full card width. */}
                <CarouselContent className="ms-0">
                  <CarouselItem className="px-6 md:px-10" inert={step !== "email"}>
                    <EmailStep
                      fetcher={login}
                      error={
                        login.data?.step === "email"
                          ? login.data.error
                          : undefined
                      }
                      pending={pendingIntent === "request"}
                    />
                  </CarouselItem>
                  <CarouselItem className="px-6 md:px-10" inert={step === "email"}>
                    <VerifyStep
                      fetcher={login}
                      email={email}
                      error={
                        login.data?.step === "verify"
                          ? login.data.error
                          : undefined
                      }
                      pending={pendingIntent === "verify"}
                      code={code}
                      onCodeChange={setCode}
                      otpRef={otpRef}
                      onUseDifferentEmail={() => setWentBack(true)}
                    />
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
            </FieldGroup>
          </div>
          <HeroPanel />
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-balance">
        {/* One sentence with two inline links, so it goes through `Trans` rather
            than being stitched from fragments — a translator needs to move the
            link text and the words around it together. The `components` keys
            match the tags in the `login.consent` string. */}
        <Trans
          i18nKey="login.consent"
          components={{
            terms: <a href="https://www.postforme.dev/terms-of-service" />,
            privacy: <a href="https://www.postforme.dev/privacy-policy" />,
          }}
        />
      </FieldDescription>
    </div>
  );
}
