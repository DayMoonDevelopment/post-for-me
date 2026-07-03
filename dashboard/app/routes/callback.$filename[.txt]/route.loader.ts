import { withSupabase } from "~/lib/.server/supabase";
import { createStorageProvider } from "~/lib/.server/storage/storage.provider";

export const loader = withSupabase(async ({ params }) => {
  let { filename } = params;

  if (!filename) {
    return new Response("Filename not provided", { status: 400 });
  }

  if (!filename.includes(".txt")) {
    filename = filename + ".txt";
  }

  const storageProvider = createStorageProvider();

  let data: Blob;
  try {
    data = await storageProvider.download("post-media", filename);
  } catch {
    return new Response("File Not Found", { status: 404 });
  }

  if (!data?.type?.includes("text/plain")) {
    return new Response("Invalid file type. Only .txt files are allowed", {
      status: 400,
    });
  }

  return new Response(data, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
});
