import { MetadataComposer } from "~/lib/meta";

import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const composer = new MetadataComposer();

  composer.title = "Subprocessors | Post for Me";
  composer.description =
    "Every third-party subprocessor Post for Me uses to run the service, what user data each one handles, and the region where that data is stored.";
  composer.canonical = "https://www.postforme.dev/subprocessors";
  composer.keywords =
    "Post for Me subprocessors, GDPR, data processing, data residency, data storage region, privacy";
  composer.contentType = "website";

  return composer.build();
};
