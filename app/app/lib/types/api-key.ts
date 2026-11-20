/**
 * Domain types for project API keys — app-native DTOs. The provider (Unkey)
 * never leaks past the service adapter: routes/UI deal only in {@link ApiKey}.
 *
 * Nothing about a key lives in our own DB — the name is provider-native and the
 * creator is a snapshot stored in the provider's key metadata. The full secret
 * is returned exactly once, on create (see the service's `create` return).
 */

/** A snapshot of who created a key, captured in the provider's metadata at
 * create time (so it survives without a DB row). `label` is the creator's name
 * or email at that moment. */
export interface ApiKeyCreator {
  id: string;
  label: null | string;
}

/**
 * A project's API key as shown in the dashboard — never the secret. `reference`
 * is the masked preview (the key's leading characters) used to recognize a key
 * in the table; the full key is only ever seen once, at creation.
 */
export interface ApiKey {
  /** ISO-8601 creation instant. */
  createdAt: string;
  createdBy: ApiKeyCreator | null;
  id: string;
  name: null | string;
  /** Masked preview of the key (its leading characters), safe to display. */
  reference: string;
}
