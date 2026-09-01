import { TUS_UPLOAD_PATH } from './tus-upload-path';

// TUS_UPLOAD_PATH (tus-server.factory.ts) is a hardcoded string that must
// match whatever Nest's URI versioning + controller path resolves to for
// MediaTusController. Nothing derives or asserts this at compile time, so
// the two can silently drift (e.g. a future versioning/prefix change) and
// every resumed upload would 404 with no obvious signal pointing at the
// real cause. Self-check once at boot instead: an unauthenticated HEAD to
// TUS_UPLOAD_PATH reaches AuthGuard (401) only if the path actually
// resolves to MediaTusController — any other status (404 in particular)
// means the route didn't match at all.
//
// Deliberately not using OPTIONS here: app.enableCors() answers every
// OPTIONS request itself (before Nest routing/guards run), so it can't be
// used to probe whether a specific path resolves to this controller.
export async function verifyTusRoute(port: number): Promise<void> {
  try {
    const res = await fetch(`http://localhost:${port}${TUS_UPLOAD_PATH}`, {
      method: 'HEAD',
    });
    if (res.status !== 401) {
      console.error(
        `[boot check] TUS_UPLOAD_PATH ('${TUS_UPLOAD_PATH}') does not resolve to the TUS controller (got HTTP ${res.status}, expected 401) — check versioning/prefix config drift.`,
      );
    }
  } catch (error) {
    console.error('[boot check] Failed to verify TUS route:', error);
  }
}
