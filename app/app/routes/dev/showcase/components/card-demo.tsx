import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/ui/card";

import { Section } from "./section";

export function CardDemo() {
  return (
    <div className="space-y-8">
      <Section title="Full anatomy">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Connected account</CardTitle>
            <CardDescription>@daymoon on Instagram</CardDescription>
            <CardAction>
              <Badge variant="success-light">Connected</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Token refreshes automatically. Last post published 2 hours ago.
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm" variant="outline">
              Manage
            </Button>
            <Button size="sm" variant="destructive">
              Disconnect
            </Button>
          </CardFooter>
        </Card>
      </Section>
      <Section title="Content only">
        <Card className="w-full max-w-sm">
          <CardContent className="text-sm">
            A bare card for free-form content.
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
