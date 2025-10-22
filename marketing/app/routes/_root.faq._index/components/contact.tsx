import { Link } from "react-router";
import { ArrowRightIcon, MailIcon, MessageCircleIcon } from "lucide-react";
import { Button } from "~/ui/button";

export const Contact = () => (
  <div className="text-center bg-muted py-16">
    <b className="text-muted-foreground uppercase font-semibold text-sm">
      Contact Us
    </b>
    <h2 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight">
      Get In Touch
    </h2>
    <p className="mt-4 text-base sm:text-lg text-muted-foreground">
      Our team is always here to chat.
    </p>
    <div className="max-w-(--breakpoint-md) mx-auto pt-12 grid md:grid-cols-2 gap-16 md:gap-10 px-6 md:px-0">
      <div className="text-center flex flex-col items-center">
        <div className="h-12 w-12 flex items-center justify-center bg-primary/5 dark:bg-primary/10 text-primary rounded-full">
          <MailIcon />
        </div>
        <h3 className="mt-6 font-semibold text-xl">Email</h3>
        <p className="mt-2 mb-4 text-muted-foreground">
          Our friendly team is here to help.
        </p>

        <Button variant="ghost" asChild>
          <Link to="mailto:postforme@daymoon.dev">
            postforme@daymoon.dev <ArrowRightIcon />
          </Link>
        </Button>
      </div>
      <div className="text-center flex flex-col items-center">
        <div className="h-12 w-12 flex items-center justify-center bg-primary/5 dark:bg-primary/10 text-primary rounded-full">
          <MessageCircleIcon />
        </div>
        <h3 className="mt-6 font-semibold text-xl">Chat</h3>
        <p className="mt-2 mb-4 text-muted-foreground">
          The quickest way to get in touch.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            // @ts-expect-error $crisp is a global dependency
            $crisp.push(["do", "chat:open"]);
          }}
        >
          Realtime Chat
          <ArrowRightIcon />
        </Button>
      </div>
    </div>
  </div>
);
