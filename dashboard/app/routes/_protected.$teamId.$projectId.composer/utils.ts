import unset from "lodash/unset";

import { deepClean } from "~/lib/utils";

import type { FormSchema } from "./schema";

const INVALID_FIELDS = ["_disclose_content", "_providers"];

export const selectPlatformConfigurations = (obj: FormSchema): FormSchema => ({
  ...obj,
  platform_configurations: obj.platform_configurations
    ? Object.fromEntries(
        Object.entries(obj.platform_configurations).filter(([provider]) =>
          obj._providers?.includes(provider),
        ),
      )
    : undefined,
});

export const cleanPayload = (obj: FormSchema) => {
  const result = selectPlatformConfigurations(obj);

  INVALID_FIELDS.forEach((key) => {
    unset(result, key);
  });

  if (result.media) {
    result.media = result.media.map((media) => ({
      url: media.url,
    }));
  }

  return deepClean(result);
};
