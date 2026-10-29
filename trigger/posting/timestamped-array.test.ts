import { describe, expect, it } from "bun:test";
import { TimestampedArray } from "./timestamped-array";

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("TimestampedArray", () => {
  it("adds an ISO timestamp to a pushed entry", () => {
    const arr = new TimestampedArray();
    arr.push({ postRequest: { text: "hello" } });

    expect(arr[0].timestamp).toMatch(ISO_TIMESTAMP);
  });

  it("preserves the existing keys on the pushed object", () => {
    const arr = new TimestampedArray();
    arr.push({ postRequest: { text: "hello" }, extra: 1 });

    expect(arr[0]).toMatchObject({
      postRequest: { text: "hello" },
      extra: 1,
    });
    expect(arr[0].timestamp).toMatch(ISO_TIMESTAMP);
  });

  it("lets an explicit timestamp on the pushed item win over the injected default", () => {
    const arr = new TimestampedArray();
    arr.push({ timestamp: "explicit-value", postRequest: {} });

    expect(arr[0].timestamp).toBe("explicit-value");
  });

  it("preserves insertion order across separate push calls", () => {
    const arr = new TimestampedArray();
    arr.push({ step: "request" });
    arr.push({ step: "response" });
    arr.push({ step: "retry-request" });

    expect(arr.map((entry) => entry.step)).toEqual([
      "request",
      "response",
      "retry-request",
    ]);
  });

  it("stamps each item independently when multiple items are pushed in one call", () => {
    const arr = new TimestampedArray();
    arr.push({ step: "a" }, { step: "b" });

    expect(arr).toHaveLength(2);
    expect(arr[0].step).toBe("a");
    expect(arr[1].step).toBe("b");
    expect(arr[0].timestamp).toMatch(ISO_TIMESTAMP);
    expect(arr[1].timestamp).toMatch(ISO_TIMESTAMP);
  });

  it("serializes as a plain array via JSON.stringify, e.g. inside details: { requests: arr }", () => {
    const arr = new TimestampedArray();
    arr.push({ postRequest: { text: "hello" } });

    const details = { requests: arr, responses: new TimestampedArray() };
    const parsed = JSON.parse(JSON.stringify(details));

    expect(Array.isArray(parsed.requests)).toBe(true);
    expect(parsed.requests[0].postRequest).toEqual({ text: "hello" });
    expect(parsed.requests[0].timestamp).toMatch(ISO_TIMESTAMP);
    expect(parsed.responses).toEqual([]);
  });

  it("spreads into a plain array as used at the call sites (e.g. [...this.#requests])", () => {
    const arr = new TimestampedArray();
    arr.push({ step: 1 });
    arr.push({ step: 2 });

    const spread = [...arr];
    expect(Array.isArray(spread)).toBe(true);
    expect(spread).toHaveLength(2);
  });
});
