export class TimestampedArray<
  T extends Record<string, unknown> = Record<string, unknown>,
> extends Array<T & { timestamp: string }> {
  push(...items: T[]): number {
    const stamped = items.map((item) => ({
      timestamp: new Date().toISOString(),
      ...item,
    }));
    return super.push(...stamped);
  }
}
