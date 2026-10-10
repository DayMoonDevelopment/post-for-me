import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/tabs";

import { Section } from "./section";

export function TabsDemo() {
  return (
    <div className="space-y-8">
      <Section title="Default">
        <Tabs defaultValue="account" className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="text-sm">
            Manage your account settings and preferences.
          </TabsContent>
          <TabsContent value="team" className="text-sm">
            Invite and manage your team members.
          </TabsContent>
          <TabsContent value="billing" className="text-sm">
            View invoices and update your payment method.
          </TabsContent>
        </Tabs>
      </Section>
      <Section title="Line">
        <Tabs defaultValue="posts" className="w-full max-w-md">
          <TabsList variant="line">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="text-sm">
            Drafts, scheduled, and published posts.
          </TabsContent>
          <TabsContent value="accounts" className="text-sm">
            Connected social accounts across platforms.
          </TabsContent>
          <TabsContent value="webhooks" className="text-sm">
            Event subscriptions and delivery logs.
          </TabsContent>
        </Tabs>
      </Section>
      <Section title="Vertical">
        <Tabs
          defaultValue="one"
          orientation="vertical"
          className="w-full max-w-md"
        >
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one" className="text-sm">
            First panel.
          </TabsContent>
          <TabsContent value="two" className="text-sm">
            Second panel.
          </TabsContent>
        </Tabs>
      </Section>
    </div>
  );
}
