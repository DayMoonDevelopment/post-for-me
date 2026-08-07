import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

/**
 * The prefix every TikTok verification file carries. TikTok issues the filename
 * (`tiktok<hash>.txt`) and fetches it from a fixed URL, which is why this route
 * serves by bare name with no project in the path.
 *
 * It is also the ONLY thing making that safe. `post-media` is a shared,
 * cross-tenant bucket read here through the SERVICE-ROLE client (RLS does not
 * apply), on a PUBLIC route — so without this gate the endpoint serves any
 * `.txt` object any tenant has ever put in the bucket.
 *
 * The value mirrors `v_tiktok_verification_files` (`name like 'tiktok%'` +
 * `mimetype like 'text/%'`), the view the setup page lists from. Matching that
 * view is deliberate: once the TikTok setup page is ported to this dashboard —
 * it currently exists only in the legacy app, so v2 can serve these files but
 * not manage them — this should tighten further to a lookup THROUGH the view,
 * which additionally requires `user_metadata->>'project_id'`. That isn't safe
 * yet: any file uploaded without that metadata would stop resolving and break a
 * live verification.
 */
const VERIFICATION_FILE_PREFIX = "tiktok";

export async function loader({ context, params }: Route.LoaderArgs) {
  // This bucket lives on Supabase today; migrating it to another provider is a
  // one-token change here (`using("supabase")` → `using("r2")`) + moving the files.
  const storage = context.get(servicesContext).fileStorage.using("supabase");

  let { filename } = params;

  if (!filename) {
    return new Response("Filename not provided", { status: 400 });
  }

  // 404, not 400 — an unauthenticated caller learns nothing about what the
  // bucket does or doesn't hold.
  if (!filename.startsWith(VERIFICATION_FILE_PREFIX)) {
    return new Response("Not found", { status: 404 });
  }

  if (!filename.includes(".txt")) {
    filename = filename + ".txt";
  }

  try {
    const data = await storage.download("post-media", filename);

    if (!data.type?.includes("text/plain")) {
      return new Response("Invalid file type. Only .txt files are allowed", {
        status: 400,
      });
    }

    return new Response(data, {
      headers: {
        "Content-Type": "text/plain",
        // The bytes are tenant-uploaded: pin the type so no sniffing can
        // reinterpret them as something executable on our own origin.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // todo : handle specific errors uniquely

    return new Response("Unable to retrieve file", { status: 400 });
  }
}
