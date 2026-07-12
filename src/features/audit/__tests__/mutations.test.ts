import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createAuditLog } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: vi.fn() },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAuditLog", () => {
  const basePayload = {
    actorUserId: "u1",
    action: "case.created",
    entityType: "Case",
    entityId: "case-1",
  };

  it("writes an audit log entry with the mapped fields", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue(undefined);

    await createAuditLog({ ...basePayload, details: "Created case: \"Smith vs Jones\"" });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actor_user_id: "u1",
        action: "case.created",
        entity_type: "Case",
        entity_id: "case-1",
        details: 'Created case: "Smith vs Jones"',
      },
    });
  });

  it("defaults details to null when omitted", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue(undefined);

    await createAuditLog(basePayload);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ details: null }),
    });
  });

  it("logs and rethrows when the write fails", async () => {
    const error = new Error("db error");
    vi.mocked(prisma.auditLog.create).mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(createAuditLog(basePayload)).rejects.toThrow("db error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to write audit log:", error);

    consoleErrorSpy.mockRestore();
  });
});