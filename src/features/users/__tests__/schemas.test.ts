import { describe, expect, it } from "vitest";

import { CreateUserSchema, DeactivateUserSchema, UpdateUserSchema } from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("CreateUserSchema", () => {
  it("accepts a valid payload", () => {
    const result = CreateUserSchema.safeParse({ email: "alice@example.com", role: "Admin" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty email", () => {
    const result = CreateUserSchema.safeParse({ email: "", role: "Admin" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = CreateUserSchema.safeParse({ email: "not-an-email", role: "Admin" });
    expect(result.success).toBe(false);
  });

  it("rejects an email longer than 255 characters", () => {
    const longLocal = "a".repeat(250);
    const result = CreateUserSchema.safeParse({ email: `${longLocal}@example.com`, role: "Admin" });
    expect(result.success).toBe(false);
  });

  it("rejects a role that is not creatable", () => {
    const result = CreateUserSchema.safeParse({ email: "dev@example.com", role: "Dev" });
    expect(result.success).toBe(false);
  });

  it("rejects a role outside the Role enum", () => {
    const result = CreateUserSchema.safeParse({ email: "alice@example.com", role: "NotARole" });
    expect(result.success).toBe(false);
  });

  it("accepts each creatable role", () => {
    for (const role of ["Admin", "BranchManager", "Lawyer", "Paralegal", "ProcessServer"]) {
      const result = CreateUserSchema.safeParse({ email: "alice@example.com", role });
      expect(result.success).toBe(true);
    }
  });
});

describe("UpdateUserSchema", () => {
  it("accepts a valid payload", () => {
    const result = UpdateUserSchema.safeParse({
      id: uuid,
      email: "alice@example.com",
      role: "Lawyer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty email", () => {
    const result = UpdateUserSchema.safeParse({ id: uuid, email: "", role: "Lawyer" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    const result = UpdateUserSchema.safeParse({
      id: "abc",
      email: "alice@example.com",
      role: "Lawyer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a role that is not creatable", () => {
    const result = UpdateUserSchema.safeParse({
      id: uuid,
      email: "alice@example.com",
      role: "Dev",
    });
    expect(result.success).toBe(false);
  });
});

describe("DeactivateUserSchema", () => {
  it("accepts a valid uuid", () => {
    expect(DeactivateUserSchema.safeParse({ id: uuid }).success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    expect(DeactivateUserSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});