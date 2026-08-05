/**
 * Liveness healthcheck: `GET /health` → `200 OK`. A dependency-free liveness
 * probe (does the app server respond?), for load balancers / uptime monitors.
 * Public + ungated by design — no session, no DB call. Readiness probes that
 * check Supabase/etc. can be a separate endpoint if we ever need them.
 */
export function loader() {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}
