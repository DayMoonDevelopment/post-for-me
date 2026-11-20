/**
 * Fixture for the Stripe webhook testing matrix
 * (app/lib/.server/subscription-access/TESTING.md).
 *
 *   bun run test:fixture          create / repair
 *   bun run test:fixture:reset    remove everything it made
 *
 * Creates, all with recognizable ids so teardown is exact:
 *   - local Supabase: one team + two projects (white-label + quickstart/system)
 *   - Unkey: one `pfm_live` key per project, in the STAGING namespace
 *   - Stripe: one sandbox customer carrying `metadata.team_id`
 *
 * The team is left UNLINKED (`stripe_customer_id = null`) on purpose — matrix
 * row E7 is what links it, and that doubles as the setup step for group B.
 */
import { Unkey } from "@unkey/api";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const TEAM_ID = "team_TEST936";
const PROJECT_WL = "proj_TEST936WL";
const PROJECT_SYS = "proj_TEST936SYS";
const CUSTOMER_LABEL = "PFM-936 webhook fixture";

const reset = process.argv.includes("--reset");

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });
const apiId = process.env.UNKEY_API_ID!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });

async function keysFor(projectId: string) {
  const rows: { enabled: boolean; keyId: string }[] = [];
  const iterator = await unkey.apis.listKeys({ apiId, externalId: projectId, limit: 100 });
  for await (const page of iterator) {
    for (const key of page.result.data) rows.push({ keyId: key.keyId, enabled: key.enabled });
  }
  return rows;
}

async function findCustomer() {
  const found = await stripe.customers.search({
    query: `metadata['team_id']:'${TEAM_ID}'`,
    limit: 1,
  });
  return found.data[0] ?? null;
}

if (reset) {
  for (const projectId of [PROJECT_WL, PROJECT_SYS]) {
    for (const key of await keysFor(projectId)) {
      await unkey.keys.deleteKey({ keyId: key.keyId });
    }
    console.log(`unkey: cleared keys for ${projectId}`);
  }
  const customer = await findCustomer();
  if (customer) {
    await stripe.customers.del(customer.id);
    console.log(`stripe: deleted ${customer.id}`);
  }
  await db.from("projects").delete().in("id", [PROJECT_WL, PROJECT_SYS]);
  await db.from("teams").delete().eq("id", TEAM_ID);
  console.log("supabase: removed fixture team + projects");
  console.log("\n✅ fixture removed");
} else {
  const team = await db
    .from("teams")
    .upsert({ id: TEAM_ID, name: "PFM-936 Test Team", stripe_customer_id: null })
    .select("id")
    .single();
  if (team.error) throw team.error;

  const projects = await db.from("projects").upsert([
    { id: PROJECT_WL, team_id: TEAM_ID, name: "Fixture — white-label", is_system: false },
    { id: PROJECT_SYS, team_id: TEAM_ID, name: "Fixture — quickstart", is_system: true },
  ]);
  if (projects.error) throw projects.error;
  console.log(`supabase: team ${TEAM_ID} + 2 projects`);

  for (const [projectId, label] of [
    [PROJECT_WL, "white-label"],
    [PROJECT_SYS, "quickstart"],
  ] as const) {
    const existing = await keysFor(projectId);
    if (existing.length > 0) {
      console.log(`unkey: ${projectId} already has ${existing.length} key(s) — left alone`);
      continue;
    }
    const created = await unkey.keys.createKey({
      apiId,
      prefix: "pfm_live",
      externalId: projectId,
      name: `fixture ${label}`,
      meta: { team_id: TEAM_ID, created_by: "fixture", created_by_label: "PFM-936 fixture" },
      enabled: true,
      recoverable: false,
    });
    console.log(`unkey: ${projectId} → ${created.data.key}`);
  }

  let customer = await findCustomer();
  customer ??= await stripe.customers.create({
    description: CUSTOMER_LABEL,
    metadata: { team_id: TEAM_ID },
  });

  // Without a default payment method a new subscription lands `incomplete`,
  // which doesn't entitle — so group B would test the wrong thing. With one
  // attached, `subscriptions create` goes straight to `active`.
  if (!customer.invoice_settings?.default_payment_method) {
    const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: pm.id },
    });
    console.log(`stripe: attached default payment method ${pm.id}`);
  }
  console.log(`stripe: customer ${customer.id} (metadata.team_id=${TEAM_ID})`);

  console.log(`\n✅ fixture ready — team ${TEAM_ID} is intentionally UNLINKED (row E7 links it)`);
}
