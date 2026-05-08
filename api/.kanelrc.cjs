/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { defaultGetMetadata } = require('kanel');
const { makeKyselyHook, kyselyTypeFilter } = require('kanel-kysely');

// PascalCase → kebab-case. `Customers` → `customers`,
// `MeterEvents` → `meter-events`, `StripeSchema` → `stripe-schema`.
const toKebabCase = (s) =>
  s.replace(
    /([A-Z])/g,
    (_, c, offset) => (offset > 0 ? '-' : '') + c.toLowerCase(),
  );

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

  // Per-table files emit as kebab-case (`customers.ts`, `meter-events.ts`)
  // so generated paths line up with the rest of the repo's file
  // conventions. Doesn't change the in-file type names — those stay
  // PascalCase per Kanel/Kysely's idiom (`CustomersTable`, `CustomersId`).
  getMetadata: (details, generateFor, instantiatedConfig) => {
    const meta = defaultGetMetadata(details, generateFor, instantiatedConfig);
    const dir = path.dirname(meta.path);
    const base = path.basename(meta.path);
    return { ...meta, path: path.join(dir, toKebabCase(base)) };
  },

  preRenderHooks: [
    makeKyselyHook({
      // emit `Database` keys like `'stripe.customers'`, `'cms.articles'` so
      // the final intersection avoids cross-schema name collisions (e.g.
      // `users` exists in both `public` and `auth`).
      includeSchemaNameInTableName: true,
    }),
    // makeKyselyHook hardcodes the schema-summary file (`StripeSchema`) and
    // the root `Database` file as PascalCase. Rewrite those last two to
    // kebab-case and patch every typeImport that points at them.
    (outputAcc) => {
      const renameMap = {};
      const renamed = {};
      for (const [filePath, file] of Object.entries(outputAcc)) {
        const base = path.basename(filePath);
        if (base !== base.toLowerCase()) {
          const newPath = path.join(path.dirname(filePath), toKebabCase(base));
          renamed[newPath] = file;
          renameMap[filePath] = newPath;
        } else {
          renamed[filePath] = file;
        }
      }
      for (const file of Object.values(renamed)) {
        if (file.fileType !== 'typescript') continue;
        for (const decl of file.declarations) {
          if (!decl.typeImports) continue;
          for (const imp of decl.typeImports) {
            if (renameMap[imp.path]) imp.path = renameMap[imp.path];
          }
        }
      }
      return renamed;
    },
  ],

  // verbatimModuleSyntax rejects `export default <typeAlias>` — rewrite the
  // Database default export so it's emitted as a type-only export.
  postRenderHooks: [
    (filePath, lines) => {
      if (!/database\.ts$/.test(filePath)) return lines;
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
