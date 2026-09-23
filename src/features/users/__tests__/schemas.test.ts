import { describe, expect, it } from "vitest";

import { UserListQuerySchema, UserRoleFilterParamSchema } from "../schemas";

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

describe("UserRoleFilterParamSchema", () => {
  it("parses a single role value", () => {
    expect(UserRoleFilterParamSchema.parse("Lawyer")).toEqual(["Lawyer"]);
  });

  it("parses multiple role values", () => {
    expect(UserRoleFilterParamSchema.parse(["Lawyer", "Admin"])).toEqual(["Lawyer", "Admin"]);
  });

  it("drops unknown values instead of failing", () => {
    expect(UserRoleFilterParamSchema.parse(["Lawyer", "Bogus"])).toEqual(["Lawyer"]);
  });

  it("deduplicates repeated values", () => {
    expect(UserRoleFilterParamSchema.parse(["Lawyer", "Lawyer", "Admin"])).toEqual([
      "Lawyer",
      "Admin",
    ]);
  });

  it("parses a missing param as no filter", () => {
    expect(UserRoleFilterParamSchema.parse(undefined)).toEqual([]);
  });
});
