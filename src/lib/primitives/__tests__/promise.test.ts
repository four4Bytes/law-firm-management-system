import { describe, expect, it } from "vitest";

import { fulfilledOrNull } from "../promise";

describe("fulfilledOrNull", () => {
  it("returns the value of a fulfilled result", () => {
    const result: PromiseSettledResult<number> = { status: "fulfilled", value: 42 };

    expect(fulfilledOrNull(result)).toBe(42);
  });

  it("returns null for a rejected result", () => {
    const result: PromiseSettledResult<number> = {
      status: "rejected",
      reason: new Error("boom"),
    };

    expect(fulfilledOrNull(result)).toBeNull();
  });

  it("preserves falsy fulfilled values instead of collapsing them to null", () => {
    const emptyArray: PromiseSettledResult<string[]> = { status: "fulfilled", value: [] };
    const zero: PromiseSettledResult<number> = { status: "fulfilled", value: 0 };

    expect(fulfilledOrNull(emptyArray)).toEqual([]);
    expect(fulfilledOrNull(zero)).toBe(0);
  });
});
