import { Link, useLoaderData, useOutletContext } from "react-router";

import { Card, CardDescription, CardHeader, CardTitle } from "~/ui/card";

import type { Route } from "./+types/route";

type OutletContext = {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
  }>;
};

export function Component() {
  const { title, summary } =
    useLoaderData<Route.ComponentProps["loaderData"]>();
  const { categories } = useOutletContext<OutletContext>();

  return (
    <div className="pt-2">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-2">{title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl text-balance">
          {summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/resources/${category.slug}`}
            className="block transition-transform hover:scale-102"
          >
            <Card className="h-full shadow-none bg-muted">
              <CardHeader>
                <CardTitle className="text-xl">{category.name}</CardTitle>
                <CardDescription className="line-clamp-3 empty:hidden">
                  {category?.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
