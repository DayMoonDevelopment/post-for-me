import { IconArrowRight, IconEmail1, IconBubble2 } from "@central-icons/outlined";

import { Link } from "~/components/link";

import { Button } from "~/ui/button";

export const Contact = () => (
  <div className="text-center pt-32 pb-12">
    <h1 className="text-muted-foreground uppercase font-semibold text-sm">
      Contact Us
    </h1>
    <h2 className="mt-0 text-2xl md:text-4xl font-semibold tracking-tight">
      Get In Touch
    </h2>
    <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-sm text-balance text-center mx-auto">
      Our team is always here to chat and help you get started setting up and
      using Post for Me.
    </p>
    <div className="max-w-(--breakpoint-md) mx-auto pt-12 grid md:grid-cols-2 gap-16 md:gap-10 px-6 md:px-0">
      <div className="text-center flex flex-col items-center">
        <div className="h-12 w-12 flex items-center justify-center bg-primary/5 dark:bg-primary/10 text-primary rounded-full">
          <IconEmail1 />
        </div>
        <h3 className="mt-2 font-semibold text-xl">Email</h3>
        <p className="mt-2 mb-4 text-muted-foreground">
          Our friendly team is here to help.
        </p>

        <Button asChild>
          <Link to="mailto:postforme@daymoon.dev">
            postforme@daymoon.dev <IconArrowRight />
          </Link>
        </Button>
      </div>
      <div className="text-center flex flex-col items-center">
        <div className="h-12 w-12 flex items-center justify-center bg-primary/5 dark:bg-primary/10 text-primary rounded-full">
          <IconBubble2 />
        </div>
        <h3 className="mt-2 font-semibold text-xl">Chat</h3>
        <p className="mt-2 mb-4 text-muted-foreground">
          The quickest way to get in touch.
        </p>
        <Button
          onClick={() => {
            // @ts-expect-error $crisp is a global dependency
            $crisp.push(["do", "chat:open"]);
          }}
        >
          Realtime Chat
          <IconArrowRight />
        </Button>
      </div>
    </div>
  </div>
);
