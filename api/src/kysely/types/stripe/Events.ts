import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.events */
export type EventsId = string & { __brand: 'stripe.events' };

/** Represents the table stripe.events */
export default interface EventsTable {
  id: ColumnType<EventsId, EventsId, EventsId>;

  type: ColumnType<string, string, string>;

  api_version: ColumnType<string | null, string | null, string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  request_id: ColumnType<string | null, string | null, string | null>;

  idempotency_key: ColumnType<string | null, string | null, string | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  received_at: ColumnType<Date, Date | string | undefined, Date | string>;

  processed_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  error: ColumnType<string | null, string | null, string | null>;

  data: ColumnType<unknown, unknown, unknown>;
}

export type Events = Selectable<EventsTable>;

export type NewEvents = Insertable<EventsTable>;

export type EventsUpdate = Updateable<EventsTable>;