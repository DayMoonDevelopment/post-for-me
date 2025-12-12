import type { Route } from "./+types/route";

export type LoaderData = Route.ComponentProps["loaderData"];

export type SocialConnection = LoaderData["connections"][number];
