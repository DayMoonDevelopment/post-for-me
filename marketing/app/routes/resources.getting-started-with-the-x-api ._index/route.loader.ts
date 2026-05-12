import { redirect } from "react-router";

export async function loader() {
  return redirect("/resources/getting-started-with-the-x-twitter-api", {
    status: 301,
  });
}
