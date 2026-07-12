import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createAuditLog } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAuditLog", () => {
  const basePayload = {
    actorUserId: uuid,
    action: "case.created",
    entityType: "Case",
    entityId: uuid,
  };

  it("creates an audit log entry with the mapped field names", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue(undefined);

    await createAuditLog({ ...basePayload, details: 'Created case: "Smith vs Jones"' });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actor_user_id: uuid,
        action: "case.created",
        entity_type: "Case",
        entity_id: uuid,
        details: 'Created case: "Smith vs Jones"',
      },
    });
  });

  it("defaults details to null when not provided", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue(undefined);

    await createAuditLog(basePayload);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ details: null }),
    });
  });

  it("resolves without a return value on success", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue(undefined);

    await expect(createAuditLog(basePayload)).resolves.toBeUndefined();
  });

  it("logs and rethrows when the write fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const dbError = new Error("db error");
    vi.mocked(prisma.auditLog.create).mockRejectedValue(dbError);

    await expect(createAuditLog(basePayload)).rejects.toThrow("db error");

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to write audit log:", dbError);

    consoleErrorSpy.mockRestore();
  });
});