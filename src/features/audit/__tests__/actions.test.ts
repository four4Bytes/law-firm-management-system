import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "Admin", name: "n" }),
}));

const getAuditLogPaginated = vi.fn();
const getEntityActivityLogPaginated = vi.fn();

vi.mock("@/features/audit/queries", () => ({
  getAuditLogPaginated,
  getEntityActivityLogPaginated,
}));

const { getAuditLogAction, getEntityActivityLogAction } = await import("../actions");

describe("getAuditLogAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated audit logs", async () => {
    const expected = { rows: [], nextCursor: null };
    getAuditLogPaginated.mockResolvedValue(expected);

    const result = await getAuditLogAction({ pageSize: 10 });

    expect(result).toEqual(expected);
    expect(getAuditLogPaginated).toHaveBeenCalledWith({ search: "", pageSize: 10 });
  });

  it("forwards search and cursor", async () => {
    await getAuditLogAction({ search: "created", cursor: "550e8400-e29b-41d4-a716-446655440000" });

    expect(getAuditLogPaginated).toHaveBeenCalledWith({
      search: "created",
      cursor: "550e8400-e29b-41d4-a716-446655440000",
      pageSize: 20,
    });
  });

  it("throws on invalid params", async () => {
    await expect(getAuditLogAction({ pageSize: 999 })).rejects.toThrow("Invalid query parameters");
  });
});

describe("getEntityActivityLogAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns entity-scoped activity logs", async () => {
    const expected = { rows: [], nextCursor: null };
    getEntityActivityLogPaginated.mockResolvedValue(expected);

    const result = await getEntityActivityLogAction({
      entityType: "Case",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result).toEqual(expected);
    expect(getEntityActivityLogPaginated).toHaveBeenCalledWith({
      entityType: "Case",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
      search: "",
      pageSize: 20,
    });
  });

  it("throws on missing entityType", async () => {
    await expect(
      getEntityActivityLogAction({ entityId: "550e8400-e29b-41d4-a716-446655440000" }),
    ).rejects.toThrow("Invalid query parameters");
  });

  it("throws on missing entityId", async () => {
    await expect(getEntityActivityLogAction({ entityType: "Case" })).rejects.toThrow(
      "Invalid query parameters",
    );
  });
});
