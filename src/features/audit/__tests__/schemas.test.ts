import { describe, expect, it } from "vitest";

import { AuditLogPageQuerySchema, EntityActivityLogQuerySchema } from "../schemas";

describe("AuditLogPageQuerySchema", () => {
  it("accepts empty params with defaults", () => {
    const result = AuditLogPageQuerySchema.parse({});
    expect(result.search).toBe("");
    expect(result.pageSize).toBe(20);
    expect(result.cursor).toBeUndefined();
  });

  it("accepts full params", () => {
    const result = AuditLogPageQuerySchema.parse({
      search: "case.created",
      cursor: "550e8400-e29b-41d4-a716-446655440000",
      pageSize: 50,
    });
    expect(result.search).toBe("case.created");
    expect(result.cursor).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.pageSize).toBe(50);
  });

  it("trims search", () => {
    const result = AuditLogPageQuerySchema.parse({ search: "  foo  " });
    expect(result.search).toBe("foo");
  });

  it("clamps pageSize", () => {
    expect(() => AuditLogPageQuerySchema.parse({ pageSize: 0 })).toThrow();
    expect(() => AuditLogPageQuerySchema.parse({ pageSize: 101 })).toThrow();
  });

  it("rejects non-uuid cursor", () => {
    expect(() => AuditLogPageQuerySchema.parse({ cursor: "not-a-uuid" })).toThrow();
  });
});

describe("EntityActivityLogQuerySchema", () => {
  it("requires entityType and entityId", () => {
    const result = EntityActivityLogQuerySchema.parse({
      entityType: "Case",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.entityType).toBe("Case");
    expect(result.entityId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.search).toBe("");
    expect(result.pageSize).toBe(20);
  });

  it("rejects empty entityType", () => {
    expect(() =>
      EntityActivityLogQuerySchema.parse({
        entityType: "",
        entityId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });

  it("rejects missing entityId", () => {
    expect(() => EntityActivityLogQuerySchema.parse({ entityType: "Case" })).toThrow();
  });
});
