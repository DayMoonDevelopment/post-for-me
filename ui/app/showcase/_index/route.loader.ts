import { redirect } from "react-router";

import { demoOrder } from "../components/demos";

export function loader() {
  return redirect(`/docs/${demoOrder[0]}`);
}
