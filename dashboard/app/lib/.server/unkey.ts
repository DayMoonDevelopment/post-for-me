import { Unkey } from "@unkey/api";

import { UNKEY_ROOT_KEY } from "./unkey.constants";

export const unkey = new Unkey({
  rootKey: UNKEY_ROOT_KEY,
});
