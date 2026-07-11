import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createConsultation, deleteConsultation, updateConsultation } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultation: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";
const booking = new Date("2024-07-15T10:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

it("createConsultation merges created_by_user_id into the create payload", async () => {
  await createConsultation({
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
    created_by_user_id: "u1",
  });

  expect(prisma.consultation.create).toHaveBeenCalledWith({
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
      status: "Scheduled",
      created_by_user_id: "u1",
    },
  });
});

it("updateConsultation strips id from the update data", async () => {
  await updateConsultation({
    id: uuid,
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
      status: "Scheduled",
    },
  });
});

it("deleteConsultation calls delete with the id", async () => {
  await deleteConsultation(uuid);

  expect(prisma.consultation.delete).toHaveBeenCalledWith({ where: { id: uuid } });
});
