import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    case: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    client: { create: vi.fn(), update: vi.fn() },
  };
  return {
    prisma: {
      ...prismaMock,
      $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock)),
    },
  };
});

const uuid = "550e8400-e29b-41d4-a716-446655440000";
const clientUuid = "660e8400-e29b-41d4-a716-446655440001";

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
    status: "Open",
  };

  it("returns an error for an invalid payload", async () => {
    expect(await createCaseAction({})).toEqual({ success: false, error: "Invalid case data" });
  });

  it("creates a case and revalidates the list", async () => {
    const result = await createCaseAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ case_type: "Civil", created_by_user_id: "u1" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(prisma.case.create).mockRejectedValue(new Error("db error"));

    expect(await createCaseAction(validPayload)).toEqual({
      success: false,
      error: "Failed to create case",
    });
  });
});

describe("updateCaseAction", () => {
  const validPayload = {
    id: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
  };

  it("returns an error for an invalid payload", async () => {
    expect(await updateCaseAction({ id: uuid })).toEqual({
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

  it("returns an error when update fails", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);
    vi.mocked(prisma.case.update).mockRejectedValue(new Error("db error"));

    expect(await updateCaseAction(validPayload)).toEqual({
      success: false,
      error: "Failed to update case",
    });
  });
});

describe("deleteCaseAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteCaseAction({ id: "abc" })).toEqual({
      success: false,
      error: "Invalid case ID",
    });
  });

  it("returns an error when the case is not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    expect(await deleteCaseAction({ id: uuid })).toEqual({
      success: false,
      error: "Case not found",
    });
  });

  it("deletes a case and revalidates the list", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);

    expect(await deleteCaseAction({ id: uuid })).toEqual({ success: true });
    expect(prisma.case.delete).toHaveBeenCalledWith({ where: { id: uuid } });
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });
});

describe("createCaseWithClientAction", () => {
  const validPayload = {
    client: { name: "Alice Client" },
    case: { case_title: "Smith vs Jones", case_type: "Civil", status: "Open" },
  };

  it("returns an error for an invalid payload", async () => {
    expect(await createCaseWithClientAction({})).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("creates the client and case, then revalidates the list", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue({
      id: clientUuid,
      name: "Alice Client",
      email: null,
      phone_number: null,
      address: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    expect(await createCaseWithClientAction(validPayload)).toEqual({ success: true });
    expect(prisma.client.create).toHaveBeenCalled();
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ client_id: clientUuid, created_by_user_id: "u1" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("returns an error when the transaction fails", async () => {
    vi.mocked(prisma.client.create).mockRejectedValue(new Error("db error"));

    expect(await createCaseWithClientAction(validPayload)).toEqual({
      success: false,
      error: "Failed to create case",
    });
  });
});

describe("updateCaseWithClientAction", () => {
  const validPayload = {
    case_id: uuid,
    client_id: clientUuid,
    client: { name: "Alice Client" },
    case: { case_title: "Smith vs Jones", case_type: "Civil", status: "Open" },
  };

  it("returns an error for an invalid payload", async () => {
    expect(await updateCaseWithClientAction({})).toEqual({
      success: false,
      error: "Invalid case data",
    });
  });

  it("updates the client and case, then revalidates", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ id: uuid, client_id: clientUuid });

    expect(await updateCaseWithClientAction(validPayload)).toEqual({ success: true });
    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: clientUuid } }),
    );
    expect(prisma.case.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: uuid } }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/case/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("returns an error when the case does not belong to the given client", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      id: uuid,
      client_id: "770e8400-e29b-41d4-a716-446655440002",
    });

    expect(await updateCaseWithClientAction(validPayload)).toEqual({
      success: false,
      error: "Failed to update case",
    });
    expect(prisma.client.update).not.toHaveBeenCalled();
  });
});
