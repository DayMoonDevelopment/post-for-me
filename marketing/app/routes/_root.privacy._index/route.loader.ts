import { marked } from "marked";

import markdown from "./content.server.md?raw";

export async function loader() {
  const content = await marked(markdown);

  return {
    content,
  };
}
