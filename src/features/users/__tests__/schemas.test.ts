import { describe, expect, it } from "vitest";

import { UserListQuerySchema } from "../schemas";

describe("UserListQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(UserListQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a single role filter", () => {
    const result = UserListQuerySchema.safeParse({ filters: { role: ["Lawyer"] } });
    expect(result.success).toBe(true);
  });

  it("accepts multiple role filters", () => {
    const result = UserListQuerySchema.safeParse({ filters: { role: ["Lawyer", "Paralegal"] } });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid role filter", () => {
    expect(UserListQuerySchema.safeParse({ filters: { role: ["Invalid"] } }).success).toBe(false);
  });
});
