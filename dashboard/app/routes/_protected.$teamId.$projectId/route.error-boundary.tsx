import { ProjectRouteError } from "~/components/project-route-error";
import type { Route } from "./+types/route";

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ProjectRouteError error={error} />;
}
