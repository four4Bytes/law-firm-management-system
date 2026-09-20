import { describe, expect, it } from "vitest";

import { UserPageQuerySchema } from "../schemas";

describe("UserPageQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(UserPageQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a single role filter", () => {
    const result = UserPageQuerySchema.safeParse({ filters: { role: ["Lawyer"] } });
    expect(result.success).toBe(true);
  });

  it("accepts multiple role filters", () => {
    const result = UserPageQuerySchema.safeParse({ filters: { role: ["Lawyer", "Paralegal"] } });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid role filter", () => {
    expect(UserPageQuerySchema.safeParse({ filters: { role: ["Invalid"] } }).success).toBe(false);
  });
});
