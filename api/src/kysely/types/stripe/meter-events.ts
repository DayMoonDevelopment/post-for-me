import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.meter_events */
export type MeterEventsEventName = string & { __brand: 'stripe.meter_events' };

/** Identifier type for stripe.meter_events */
export type MeterEventsIdentifier = string & { __brand: 'stripe.meter_events' };

/** Represents the table stripe.meter_events */
export default interface MeterEventsTable {
  event_name: ColumnType<MeterEventsEventName, MeterEventsEventName, MeterEventsEventName>;

  identifier: ColumnType<MeterEventsIdentifier, MeterEventsIdentifier, MeterEventsIdentifier>;

  customer_id: ColumnType<string | null, string | null, string | null>;

  value: ColumnType<string | null, string | null, string | null>;

  payload: ColumnType<unknown, unknown, unknown>;

  event_timestamp: ColumnType<Date, Date | string, Date | string>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type MeterEvents = Selectable<MeterEventsTable>;

export type NewMeterEvents = Insertable<MeterEventsTable>;

export type MeterEventsUpdate = Updateable<MeterEventsTable>;