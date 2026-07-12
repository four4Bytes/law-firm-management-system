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

vi.mock("@/lib/prisma", () => {
  const caseMock = { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() };
  const clientMock = { create: vi.fn(), update: vi.fn() };

  return {
    prisma: {
      case: caseMock,
      client: clientMock,
      // createCaseWithClient/updateCaseWithClient run inside prisma.$transaction; reuse the
      // same case/client mocks for the tx client so tests can configure behavior via
      // `prisma.case`/`prisma.client` regardless of which code path is under test.
      $transaction: vi.fn(
        (callback: (tx: { case: typeof caseMock; client: typeof clientMock }) => unknown) =>
          callback({ case: caseMock, client: clientMock }),
      ),
    },
  };
});

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

  it("records an audit log entry for the created case", async () => {
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

  it("returns an error when creation fails", async () => {
    vi.mocked(prisma.case.create).mockRejectedValue(new Error("db error"));

    expect(await createCaseAction(validPayload)).toEqual({
      success: false,
      error: "Failed to create case",
    });
  });

  it("does not record an audit log entry when creation fails", async () => {
    vi.mocked(prisma.case.create).mockRejectedValue(new Error("db error"));

    await createCaseAction(validPayload);

    expect(createAuditLog).not.toHaveBeenCalled();
  });
});

describe("createCaseWithClientAction", () => {
  const validPayload = {
    client: { name: "Alice Client" },
    case: { case_title: "Smith vs Jones", case_type: "Civil", status: "Open" as const },
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createCaseWithClientAction({} as any)).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("creates a client and case together and revalidates the list", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue({ id: "new-client-id" });
    vi.mocked(prisma.case.create).mockResolvedValue(caseRecord);

    const result = await createCaseWithClientAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Alice Client" }) }),
    );
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          client_id: "new-client-id",
          case_title: "Smith vs Jones",
          created_by_user_id: "u1",
        }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("records an audit log entry referencing both the case and the client", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue({ id: "new-client-id" });
    vi.mocked(prisma.case.create).mockResolvedValue(caseRecord);

    await createCaseWithClientAction(validPayload);

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "case.created",
      entityType: "Case",
      entityId: caseRecord.id,
      details: 'Created case: "Smith vs Jones" with client: "Alice Client"',
    });
  });

  it("returns an error when the transaction fails", async () => {
    vi.mocked(prisma.client.create).mockRejectedValue(new Error("db error"));

    expect(await createCaseWithClientAction(validPayload)).toEqual({
      success: false,
      error: "Failed to create case",
    });
    expect(createAuditLog).not.toHaveBeenCalled();
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

  it("records an audit log entry referencing the pre-update case title", async () => {
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

  it("does not record an audit log entry when the case is not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    await updateCaseAction(validPayload);

    expect(createAuditLog).not.toHaveBeenCalled();
  });
});

describe("updateCaseWithClientAction", () => {
  const validPayload = {
    case_id: uuid,
    client_id: uuid,
    client: { name: "Alice Client" },
    case: { case_title: "Smith vs Jones", case_type: "Civil", status: "Open" as const },
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await updateCaseWithClientAction({} as any)).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("updates the client and case together and revalidates", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ id: uuid, client_id: uuid });
    vi.mocked(prisma.client.update).mockResolvedValue({ id: uuid });
    vi.mocked(prisma.case.update).mockResolvedValue(caseRecord);

    const result = await updateCaseWithClientAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: uuid },
        data: expect.objectContaining({ name: "Alice Client" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/case/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("records an audit log entry referencing both the case and the client", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ id: uuid, client_id: uuid });
    vi.mocked(prisma.client.update).mockResolvedValue({ id: uuid });
    vi.mocked(prisma.case.update).mockResolvedValue(caseRecord);

    await updateCaseWithClientAction(validPayload);

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "case.updated",
      entityType: "Case",
      entityId: uuid,
      details: 'Updated case: "Smith vs Jones" with client: "Alice Client"',
    });
  });

  it("returns an error when the case does not belong to the given client", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ id: uuid, client_id: "other-client" });

    expect(await updateCaseWithClientAction(validPayload)).toEqual({
      success: false,
      error: "Failed to update case",
    });
    expect(createAuditLog).not.toHaveBeenCalled();
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

  it("records an audit log entry referencing the deleted case title", async () => {
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

  it("does not record an audit log entry when the case is not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    await deleteCaseAction({ caseId: uuid });

    expect(createAuditLog).not.toHaveBeenCalled();
  });
});
