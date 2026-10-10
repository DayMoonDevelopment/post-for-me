import { redirect } from "react-router";

import { demoOrder } from "../showcase/components/demos";

export function loader() {
  return redirect(`/showcase/${demoOrder[0]}`);
}
