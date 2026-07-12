import { beforeEach, describe, expect, it, vi } from "vitest";

import { Case } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import {
  createCase,
  createCaseWithClient,
  deleteCase,
  updateCase,
  updateCaseWithClient,
} from "../mutations";

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
  id: uuid,
  client_id: clientUuid,
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

it("createCase merges created_by_user_id into the create payload", async () => {
  await createCase({
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    created_by_user_id: "u1",
  });

  expect(prisma.case.create).toHaveBeenCalledWith({
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      created_by_user_id: "u1",
    },
  });
});

it("updateCase strips id and maps empty parties_involved to null", async () => {
  await updateCase({
    id: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    parties_involved: "",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: null,
    },
  });
});

it("updateCase passes a defined parties_involved through", async () => {
  await updateCase({
    id: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    parties_involved: "Smith (Plaintiff)",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: "Smith (Plaintiff)",
    },
  });
});

it("createCase passes through parties_involved and source_consultation_id when provided", async () => {
  await createCase({
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    parties_involved: "Smith (Plaintiff)",
    source_consultation_id: uuid,
    created_by_user_id: "u1",
  });

  expect(prisma.case.create).toHaveBeenCalledWith({
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: "Smith (Plaintiff)",
      source_consultation_id: uuid,
      created_by_user_id: "u1",
    },
  });
});

it("updateCase passes through source_consultation_id", async () => {
  await updateCase({
    id: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    source_consultation_id: uuid,
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      source_consultation_id: uuid,
      parties_involved: null,
    },
  });
});

it("deleteCase calls delete with the id", async () => {
  await deleteCase(uuid);

  expect(prisma.case.delete).toHaveBeenCalledWith({ where: { id: uuid } });
});

describe("createCaseWithClient", () => {
  const payload = {
    client: {
      name: "Alice Client",
      email: "alice@example.com",
      phone_number: "09170000001",
      address: "123 Rizal St.",
    },
    case: {
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open" as const,
      parties_involved: "Smith (Plaintiff)",
    },
    created_by_user_id: "u1",
  };

  it("creates the client, then the case linked to the new client", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue({
      id: clientUuid,
      name: "Alice Client",
      email: "alice@example.com",
      phone_number: "09170000001",
      address: "123 Rizal St.",
      created_at: new Date(),
      updated_at: new Date(),
    });

    await createCaseWithClient(payload);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.client.create).toHaveBeenCalledWith({
      data: {
        name: "Alice Client",
        email: "alice@example.com",
        phone_number: "09170000001",
        address: "123 Rizal St.",
      },
    });
    expect(prisma.case.create).toHaveBeenCalledWith({
      data: {
        client_id: clientUuid,
        case_title: "Smith vs Jones",
        case_type: "Civil",
        status: "Open",
        parties_involved: "Smith (Plaintiff)",
        created_by_user_id: "u1",
      },
    });
  });

  it("maps optional empty client fields to undefined", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue({
      id: clientUuid,
      name: "Bob Client",
      email: null,
      phone_number: null,
      address: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await createCaseWithClient({
      ...payload,
      client: { name: "Bob Client" },
    });

    expect(prisma.client.create).toHaveBeenCalledWith({
      data: {
        name: "Bob Client",
        email: undefined,
        phone_number: undefined,
        address: undefined,
      },
    });
  });

  it("maps a missing parties_involved to undefined on the created case", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue({
      id: clientUuid,
      name: "Alice Client",
      email: null,
      phone_number: null,
      address: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await createCaseWithClient({
      ...payload,
      case: { ...payload.case, parties_involved: undefined },
    });

    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parties_involved: undefined }) }),
    );
  });
});

describe("updateCaseWithClient", () => {
  const payload = {
    case_id: uuid,
    client_id: clientUuid,
    client: {
      name: "Alice Client",
      email: "alice@example.com",
      phone_number: "09170000001",
      address: "123 Rizal St.",
    },
    case: {
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open" as const,
      parties_involved: "Smith (Plaintiff)",
    },
  };

  it("throws when the case does not exist", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    await expect(updateCaseWithClient(payload)).rejects.toThrow(
      "Case not found or does not belong to the specified client",
    );
    expect(prisma.client.update).not.toHaveBeenCalled();
  });

  it("throws when the case belongs to a different client", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      ...caseRecord,
      id: uuid,
      client_id: "770e8400-e29b-41d4-a716-446655440002",
    });

    await expect(updateCaseWithClient(payload)).rejects.toThrow(
      "Case not found or does not belong to the specified client",
    );
    expect(prisma.client.update).not.toHaveBeenCalled();
  });

  it("updates the client and the case when they match", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ ...caseRecord, id: uuid, client_id: clientUuid });

    await updateCaseWithClient(payload);

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: clientUuid },
      data: {
        name: "Alice Client",
        email: "alice@example.com",
        phone_number: "09170000001",
        address: "123 Rizal St.",
      },
    });
    expect(prisma.case.update).toHaveBeenCalledWith({
      where: { id: uuid },
      data: {
        client_id: clientUuid,
        case_title: "Smith vs Jones",
        case_type: "Civil",
        status: "Open",
        parties_involved: "Smith (Plaintiff)",
      },
    });
  });

  it("maps a falsy parties_involved to null on the updated case", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ ...caseRecord, id: uuid, client_id: clientUuid });

    await updateCaseWithClient({
      ...payload,
      case: { ...payload.case, parties_involved: undefined },
    });

    expect(prisma.case.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parties_involved: null }) }),
    );
  });
});
