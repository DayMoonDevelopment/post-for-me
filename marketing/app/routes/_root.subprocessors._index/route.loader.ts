import {
  SUBPROCESSOR_GROUPS,
  SUBPROCESSORS_LAST_UPDATED,
} from "~/lib/.server/data/subprocessors";

export function loader() {
  return {
    groups: SUBPROCESSOR_GROUPS,
    lastUpdated: SUBPROCESSORS_LAST_UPDATED,
  };
}
