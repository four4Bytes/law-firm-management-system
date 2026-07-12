import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuditLog } from "@/features/audit/mutations";
import { Case } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import {
  createCaseAction,
  createCaseWithClientAction,
  deleteCaseAction,
  getCaseForEditAction,
  updateCaseAction,
  updateCaseWithClientAction,
} from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/audit/mutations", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    case: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    client: { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const caseRecord: Case = {
  id: "1",
  client_id: uuid,
  case_title: "Smith vs Jones",
  case_type: "Civil",
  status: "Open",
  parties_involved: null,
  source_consultation_id: null,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCaseForEditAction", () => {
  it("returns edit data for a valid id", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);

    const result = await getCaseForEditAction(uuid);

    expect(result).toEqual(caseRecord);
    expect(prisma.case.findUnique).toHaveBeenCalledWith({
      where: { id: uuid },
      select: {
        id: true,
        client_id: true,
        case_title: true,
        case_type: true,
        status: true,
        parties_involved: true,
        source_consultation_id: true,
      },
    });
  });

  it("throws for an invalid id", async () => {
    await expect(getCaseForEditAction("abc")).rejects.toThrow("Invalid case ID");
  });

  it("returns null when the case is not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    const result = await getCaseForEditAction(uuid);

    expect(result).toBeNull();
  });
});

describe("createCaseAction", () => {
  const validPayload = {
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open" as const,
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createCaseAction({} as any)).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("creates a case and revalidates the list", async () => {
    vi.mocked(prisma.case.create).mockResolvedValue(caseRecord);

    const result = await createCaseAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ case_type: "Civil", created_by_user_id: "u1" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("writes an audit log entry for the created case", async () => {
    vi.mocked(prisma.case.create).mockResolvedValue(caseRecord);

    await createCaseAction(validPayload);

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "case.created",
      entityType: "Case",
      entityId: caseRecord.id,
      details: 'Created case: "Smith vs Jones"',
    });
  });

  it("still succeeds if writing the audit log fails", async () => {
    vi.mocked(prisma.case.create).mockResolvedValue(caseRecord);
    vi.mocked(createAuditLog).mockRejectedValue(new Error("audit failure"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createCaseAction(validPayload);

    expect(result).toEqual({ success: true });
    await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());

    consoleErrorSpy.mockRestore();
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(prisma.case.create).mockRejectedValue(new Error("db error"));

    expect(await createCaseAction(validPayload)).toEqual({
      success: false,
      error: "Failed to create case",
    });
  });
});

describe("createCaseWithClientAction", () => {
  const validPayload = {
    client: { name: "Alice Client" },
    case: {
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open" as const,
    },
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createCaseWithClientAction({} as any)).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("creates a client and case, writes an audit log, and revalidates", async () => {
    const newClient = { id: "client-1", name: "Alice Client" };
    const newCase = { ...caseRecord, id: "case-1", client_id: "client-1" };
    const txCaseCreate = vi.fn().mockResolvedValue(newCase);
    const txClientCreate = vi.fn().mockResolvedValue(newClient);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(((cb: any) =>
      cb({ client: { create: txClientCreate }, case: { create: txCaseCreate } })) as any);

    const result = await createCaseWithClientAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(txClientCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Alice Client" }) }),
    );
    expect(txCaseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ client_id: "client-1", created_by_user_id: "u1" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case");
    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "case.created",
      entityType: "Case",
      entityId: "case-1",
      details: 'Created case: "Smith vs Jones" with client: "Alice Client"',
    });
  });

  it("returns an error when the transaction fails", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("db error"));

    expect(await createCaseWithClientAction(validPayload)).toEqual({
      success: false,
      error: "Failed to create case",
    });
  });
});

describe("updateCaseAction", () => {
  const validPayload = {
    caseId: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open" as const,
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await updateCaseAction({ caseId: uuid } as any)).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("returns an error when the case is not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    expect(await updateCaseAction(validPayload)).toEqual({
      success: false,
      error: "Case not found",
    });
  });

  it("updates a case and revalidates", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);

    expect(await updateCaseAction(validPayload)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/case/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("writes an audit log entry referencing the previous case title", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);

    await updateCaseAction(validPayload);

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "case.updated",
      entityType: "Case",
      entityId: uuid,
      details: 'Updated case: "Smith vs Jones"',
    });
  });

  it("returns an error when update fails", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);
    vi.mocked(prisma.case.update).mockRejectedValue(new Error("db error"));

    expect(await updateCaseAction(validPayload)).toEqual({
      success: false,
      error: "Failed to update case",
    });
  });
});

describe("updateCaseWithClientAction", () => {
  const validPayload = {
    case_id: uuid,
    client_id: uuid,
    client: { name: "Alice Updated" },
    case: {
      case_title: "Smith vs Jones Updated",
      case_type: "Civil",
      status: "Open" as const,
    },
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await updateCaseWithClientAction({} as any)).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("updates the case and client, writes an audit log, and revalidates", async () => {
    const txCaseFindUnique = vi.fn().mockResolvedValue({ id: uuid, client_id: uuid });
    const txCaseUpdate = vi.fn().mockResolvedValue({ ...caseRecord, id: uuid });
    const txClientUpdate = vi.fn().mockResolvedValue({ id: uuid, name: "Alice Updated" });

    vi.mocked(prisma.$transaction).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((cb: any) =>
        cb({
          case: { findUnique: txCaseFindUnique, update: txCaseUpdate },
          client: { update: txClientUpdate },
        })) as any,
    );

    const result = await updateCaseWithClientAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(txCaseFindUnique).toHaveBeenCalledWith({
      where: { id: uuid },
      select: { id: true, client_id: true },
    });
    expect(txClientUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Alice Updated" }) }),
    );
    expect(txCaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: uuid },
        data: expect.objectContaining({ case_title: "Smith vs Jones Updated" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/case/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/case");
    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "case.updated",
      entityType: "Case",
      entityId: uuid,
      details: 'Updated case: "Smith vs Jones Updated" with client: "Alice Updated"',
    });
  });

  it("returns an error when the transaction fails", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("db error"));

    expect(await updateCaseWithClientAction(validPayload)).toEqual({
      success: false,
      error: "Failed to update case",
    });
  });
});

describe("deleteCaseAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteCaseAction({ caseId: "abc" })).toEqual({
      success: false,
      error: "Invalid case ID",
    });
  });

  it("returns an error when the case is not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    expect(await deleteCaseAction({ caseId: uuid })).toEqual({
      success: false,
      error: "Case not found",
    });
  });

  it("deletes a case and revalidates the list", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);

    expect(await deleteCaseAction({ caseId: uuid })).toEqual({ success: true });
    expect(prisma.case.delete).toHaveBeenCalledWith({ where: { id: uuid } });
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("writes an audit log entry referencing the deleted case title", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);

    await deleteCaseAction({ caseId: uuid });

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "case.deleted",
      entityType: "Case",
      entityId: uuid,
      details: 'Deleted case: "Smith vs Jones"',
    });
  });
});
