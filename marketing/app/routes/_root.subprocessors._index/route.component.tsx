import { useLoaderData } from "react-router";

import { Link } from "~/components/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/table";

import type { Route } from "./+types/route";

export function Component() {
  const { groups, lastUpdated } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="p-4 pt-22 max-w-5xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
        Subprocessors
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {lastUpdated}
      </p>

      <div className="mt-6 space-y-4 text-muted-foreground max-w-3xl">
        <p>
          Post for Me is operated by Day Moon Development LLC. To run the
          service we use the third-party subprocessors below. Each table lists
          what the vendor does for us, which user data it handles, and where
          that data is stored or processed.
        </p>
        <p>
          Social platforms you publish to (TikTok, Facebook, Instagram, X,
          LinkedIn, Pinterest, Bluesky, Threads, YouTube) are not listed:
          you choose to send your content to them, and their own terms apply.
        </p>
        <p>
          For questions about how we process your data, email{" "}
          <Link
            to="mailto:privacy@postforme.dev"
            className="text-foreground underline underline-offset-4"
          >
            privacy@postforme.dev
          </Link>
          . See also our{" "}
          <Link
            to="/privacy"
            className="text-foreground underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.title} className="mt-12">
          <h2 className="text-xl font-semibold">{group.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.description}
          </p>

          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Subprocessor</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>User data processed</TableHead>
                <TableHead>Data location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.subprocessors.map((subprocessor) => (
                <TableRow key={subprocessor.name}>
                  <TableCell className="align-top font-medium">
                    <Link
                      to={subprocessor.website}
                      className="underline underline-offset-4"
                    >
                      {subprocessor.name}
                    </Link>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal min-w-48">
                    {subprocessor.purpose}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal min-w-64 text-muted-foreground">
                    {subprocessor.data}
                  </TableCell>
                  <TableCell className="align-top">
                    {subprocessor.location ?? "To be confirmed"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
