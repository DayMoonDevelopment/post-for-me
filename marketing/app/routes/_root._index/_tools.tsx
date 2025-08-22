import {
  BracketsIcon,
  PeopleIcon,
  KeyIcon,
  Layers3Icon,
  PaymentIcon,
  PencilLineIcon,
} from "icons";

import {
  Card,
  CardTitle,
  CardContent,
  CardDescription,
  CardHeader,
  CardSeparator,
} from "~/ui/card";

const tools = [
  {
    icon: KeyIcon,
    title: "Use your own APP Credentials",
    content: (
      <CardDescription>
        Your users stay connected to <strong>your</strong> app so you can own
        your own connections, set your own rate limits, and control your data.
      </CardDescription>
    ),
  },
  {
    icon: PeopleIcon,
    title: "Unlimited social accounts",
    content: (
      <CardDescription>
        No limits on accounts connected, post to as <strong>many</strong>{" "}
        accounts as you want, as <strong>often</strong> as you want.
      </CardDescription>
    ),
  },
  {
    icon: PencilLineIcon,
    title: "Platform-specific overrides",
    content: (
      <CardDescription>
        Set global defaults, then tweak fields per provider and/or account.
      </CardDescription>
    ),
  },
  {
    icon: BracketsIcon,
    title: "REST API",
    content: (
      <CardDescription>
        Simple, single point of entry for every platform.
      </CardDescription>
    ),
  },
  {
    icon: Layers3Icon,
    title: "SDK's",
    content: (
      <CardDescription>
        Drop-in libraries for rapid integration.
      </CardDescription>
    ),
  },
  {
    icon: PaymentIcon,
    title: "Webhook",
    content: (
      <CardDescription>
        Real-time account connections and post status.
      </CardDescription>
    ),
  },
];

export function Tools() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <h2 className="text-4xl lg:text-5xl">
        <span>Built for shipping.</span>
        <br />
        <span>Scaled for growth.</span>
      </h2>
      <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tools.map((tool, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                <tool.icon className="size-6 text-muted-foreground" />
                {tool.title}
              </CardTitle>
            </CardHeader>

            <CardSeparator />

            <CardContent>{tool.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
