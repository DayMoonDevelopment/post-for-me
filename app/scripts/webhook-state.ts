/**
 * Prints the state the webhook testing matrix asserts against:
 * the fixture team's link, its Stripe subscriptions, and every key's
 * `enabled` + `plan_*` metadata.
 *
 *   bun run test:state
 *
 * Run it after each row in app/lib/.server/subscription-access/TESTING.md.
 */
import { Unkey } from "@unkey/api";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const TEAM_ID = process.argv[2] ?? "team_TEST936";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });
const apiId = process.env.UNKEY_API_ID!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });

const team = await db
  .from("teams")
  .select("id, name, stripe_customer_id")
  .eq("id", TEAM_ID)
  .maybeSingle();
if (team.error) throw team.error;
if (!team.data) {
  console.log(`no team ${TEAM_ID} — run \`bun run test:fixture\` first`);
  process.exit(1);
}

console.log(`TEAM  ${team.data.id}  "${team.data.name}"`);
console.log(`      stripe_customer_id = ${team.data.stripe_customer_id ?? "null (unlinked)"}`);

if (team.data.stripe_customer_id) {
  const subs = await stripe.subscriptions.list({
    customer: team.data.stripe_customer_id,
    status: "all",
    limit: 10,
  });
  if (subs.data.length === 0) console.log("      subscriptions: none");
  for (const sub of subs.data) {
    const items = sub.items.data
      .map((i) => `${typeof i.price.product === "string" ? i.price.product : i.price.product.id}`)
      .join(" + ");
    console.log(`      sub ${sub.id}  status=${sub.status}  items=[${items}]`);
  }
}

const projects = await db
  .from("projects")
  .select("id, name, is_system")
  .eq("team_id", TEAM_ID)
  .order("is_system");
if (projects.error) throw projects.error;

for (const project of projects.data ?? []) {
  console.log(`\nPROJECT ${project.id}  ${project.is_system ? "[system/quickstart]" : "[white-label]"}`);
  const iterator = await unkey.apis.listKeys({
    apiId,
    externalId: project.id,
    limit: 100,
    revalidateKeysCache: true,
  });
  let count = 0;
  for await (const page of iterator) {
    for (const key of page.result.data) {
      count += 1;
      const meta = (key.meta ?? {}) as Record<string, unknown>;
      const plan = ["plan_type", "plan_name", "plan_post_limit"]
        .map((field) => `${field}=${meta[field] ?? "—"}`)
        .join("  ");
      console.log(`  ${key.enabled ? "ENABLED " : "DISABLED"}  ${key.start}…  ${plan}`);
    }
  }
  if (count === 0) console.log("  (no keys)");
}
