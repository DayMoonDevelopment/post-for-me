/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { makeKyselyHook, kyselyTypeFilter } = require('kanel-kysely');

/** @type {import('kanel').Config} */
module.exports = {
  connection:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres',

  // Kysely is used solely for the `stripe` schema today — every other table
  // is still accessed via the Supabase JS SDK with its own generated types.
  // We deliberately don't include `public`, `cms`, `auth`, or `storage` here;
  // adding them would generate ~130 unused files and force the `Database`
  // type to model a surface area Kysely never queries. Stripe mirror tables
  // have no FKs out of the schema (see migration), so cross-schema resolution
  // isn't needed.
  schemas: ['stripe'],

  preDeleteOutputFolder: true,
  outputPath: path.join(__dirname, 'src/kysely/types'),

  preRenderHooks: [
    makeKyselyHook({
      // emit `Database` keys like `'stripe.events'`, `'cms.articles'` so the
      // final intersection avoids cross-schema name collisions (e.g. `users`
      // exists in both `public` and `auth`).
      includeSchemaNameInTableName: true,
    }),
  ],

  // verbatimModuleSyntax rejects `export default <typeAlias>` — rewrite the
  // Database default export so it's emitted as a type-only export.
  postRenderHooks: [
    (filePath, lines) => {
      if (!/Database\.ts$/.test(filePath)) return lines;
      return lines.map((line) =>
        line.replace(/^export default Database;$/, 'export type { Database as default };'),
      );
    },
  ],

  typeFilter: kyselyTypeFilter,

  customTypeMap: {
    'pg_catalog.tsvector': 'string',
    'pg_catalog.jsonb': 'unknown',
    'pg_catalog.json': 'unknown',
    'pg_catalog.timestamptz': 'Date',
    'pg_catalog.timestamp': 'Date',
    'pg_catalog.bytea': 'Buffer',
    'pg_catalog.interval': 'string',
  },
};
