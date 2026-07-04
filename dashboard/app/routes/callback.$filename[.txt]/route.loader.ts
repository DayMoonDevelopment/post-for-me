import { withSupabase } from "~/lib/.server/supabase";
import { createStorageProvider as createSupabaseProvider } from "~/lib/.server/storage/supabase-storage.provider";
import { createStorageProvider as createR2Provider } from "~/lib/.server/storage/r2-storage.provider";

// TikTok verification files have no team context in the URL, so we try
// Supabase first (existing teams), then R2 (teams migrated via the flag).
const _supabase = createSupabaseProvider();
const _r2 = createR2Provider();

export const loader = withSupabase(async ({ params }) => {
  let { filename } = params;

  if (!filename) {
    return new Response("Filename not provided", { status: 400 });
  }

  if (!filename.includes(".txt")) {
    filename = filename + ".txt";
  }

  let data: Blob | undefined;
  try {
    data = await _supabase.download("post-media", filename);
  } catch {
    // File not on Supabase — try R2 (team may have migrated).
    try {
      data = await _r2.download("post-media", filename);
    } catch {
      return new Response("File Not Found", { status: 404 });
    }
  }

  if (!data) {
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
