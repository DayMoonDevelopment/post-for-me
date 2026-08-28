import { withSupabase } from "~/lib/.server/supabase";
import { createStorageProvider as createSupabaseProvider } from "~/lib/.server/storage/supabase-storage.provider";
import { createStorageProvider as createR2Provider } from "~/lib/.server/storage/r2-storage.provider";

// TikTok verification files have no team context in the URL, so we look up
// which backend actually stored the file (recorded at upload time in
// tiktok_verification_files) rather than guessing via sequential fallback —
// that used to turn every real infra failure into an indistinguishable 404
// and cost R2-hosted files two round trips.
// Providers are lazily initialised so importing this module doesn't crash
// environments where R2 env vars are absent.
let _supabase: ReturnType<typeof createSupabaseProvider> | undefined;
let _r2: ReturnType<typeof createR2Provider> | undefined;

function getSupabase() {
  return (_supabase ??= createSupabaseProvider());
}

function getR2() {
  return (_r2 ??= createR2Provider());
}

export const loader = withSupabase(async ({ supabaseServiceRole, params }) => {
  let { filename } = params;

  if (!filename) {
    return new Response("Filename not provided", { status: 400 });
  }

  if (!filename.includes(".txt")) {
    filename = filename + ".txt";
  }

  const { data: record, error } = await supabaseServiceRole
    .from("tiktok_verification_files")
    .select("provider, bucket, key")
    .eq("file_name", filename)
    .maybeSingle();

  if (error) {
    console.error("Failed to look up verification file record:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  if (!record) {
    return new Response("File Not Found", { status: 404 });
  }

  const storageProvider = record.provider === "r2" ? getR2() : getSupabase();

  let data: Blob | undefined;
  try {
    data = await storageProvider.download(record.bucket, record.key);
  } catch (downloadError) {
    console.error("Failed to download verification file:", downloadError);
    return new Response("Internal Server Error", { status: 500 });
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
