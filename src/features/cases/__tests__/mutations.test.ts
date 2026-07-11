import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createCase, deleteCase, updateCase } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    case: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

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

it("updateCase strips id and maps empty parties_involved to undefined", async () => {
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
      parties_involved: undefined,
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
      parties_involved: undefined,
    },
  });
});

it("deleteCase calls delete with the id", async () => {
  await deleteCase(uuid);

  expect(prisma.case.delete).toHaveBeenCalledWith({ where: { id: uuid } });
});
