import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getAuditLogPaginated, getEntityActivityLogPaginated } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn() },
    case: { findMany: vi.fn() },
    consultation: { findMany: vi.fn() },
  },
}));

const mockLog = (overrides: Record<string, unknown> = {}) => ({
  id: "l1",
  action: "case.created",
  actor_user_id: "u1",
  entity_type: "Case",
  entity_id: "550e8400-e29b-41d4-a716-446655440000",
  details: "Created case: Smith vs Jones",
  created_at: new Date("2024-06-01"),
  actor: { name: "Bob Lawyer" },
  ...overrides,
});

describe("getAuditLogPaginated", () => {
  it("returns all activity log rows with entityExists", async () => {
    const logs = [
      mockLog({ entity_id: "550e8400-e29b-41d4-a716-446655440001" }),
      mockLog({ id: "l2", action: "user.created", entity_type: "User", entity_id: "u1" }),
    ];
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);
    vi.mocked(prisma.case.findMany).mockResolvedValue([
      { id: "550e8400-e29b-41d4-a716-446655440001" },
    ] as never[]);

    const result = await getAuditLogPaginated({ pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "l1",
      action: "case.created",
      actor: "Bob Lawyer",
      entityType: "Case",
      entityId: "550e8400-e29b-41d4-a716-446655440001",
      entityExists: true,
      details: "Created case: Smith vs Jones",
      created_at: logs[0].created_at,
    });
    expect(prisma.case.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["550e8400-e29b-41d4-a716-446655440001"] } },
      select: { id: true },
    });
  });

  it("sets entityExists to false when entity is deleted", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    const result = await getAuditLogPaginated({ pageSize: 10 });

    expect(result.rows[0].entityExists).toBe(false);
  });

  it("filters by search across action and details", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    await getAuditLogPaginated({ search: "created", pageSize: 10 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { action: { contains: "created", mode: "insensitive" } },
            { details: { contains: "created", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const cursorId = "550e8400-e29b-41d4-a716-446655440002";
    const logs = Array.from({ length: 4 }, (_, i) =>
      mockLog({ id: `00000000-0000-0000-0000-00000000000${i}` }),
    );
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    const result = await getAuditLogPaginated({ pageSize: 3, cursor: cursorId });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("00000000-0000-0000-0000-000000000002");
  });

  it("returns empty when no logs", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    const result = await getAuditLogPaginated({ pageSize: 10 });

    expect(result.rows).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("sets nextCursor when more results exist", async () => {
    const logs = Array.from({ length: 4 }, (_, i) => mockLog({ id: String(i + 1) }));
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    const result = await getAuditLogPaginated({ pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("uses default pageSize when not specified", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    await getAuditLogPaginated({});

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 21 }));
  });
});

describe("getEntityActivityLogPaginated", () => {
  it("filters by entity type and id", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    await getEntityActivityLogPaginated({
      entityType: "Case",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entity_type: "Case",
          entity_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      }),
    );
  });

  it("filters by entity type, id, and search", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);

    await getEntityActivityLogPaginated({
      entityType: "Consultation",
      entityId: "660e8400-e29b-41d4-a716-446655440000",
      search: "updated",
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entity_type: "Consultation",
          entity_id: "660e8400-e29b-41d4-a716-446655440000",
          OR: [
            { action: { contains: "updated", mode: "insensitive" } },
            { details: { contains: "updated", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("returns mapped rows with entityExists", async () => {
    const logs = [mockLog()];
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);
    vi.mocked(prisma.case.findMany).mockResolvedValue([
      { id: "550e8400-e29b-41d4-a716-446655440000" },
    ] as never[]);

    const result = await getEntityActivityLogPaginated({
      entityType: "Case",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.rows[0].entityType).toBe("Case");
    expect(result.rows[0].entityId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.rows[0].entityExists).toBe(true);
  });

  it("handles cursor pagination", async () => {
    const logs = Array.from({ length: 4 }, (_, i) =>
      mockLog({ id: String(i + 1), entity_id: "550e8400-e29b-41d4-a716-446655440000" }),
    );
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    const result = await getEntityActivityLogPaginated({
      entityType: "Case",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
      pageSize: 3,
    });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });
});
