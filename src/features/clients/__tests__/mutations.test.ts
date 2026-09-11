import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createClient, updateClient } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: { create: vi.fn(), update: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  vi.clearAllMocks();
});

it("createClient passes required phone_number through and selects id and name", async () => {
  await createClient({ name: "Alice", email: "", phone_number: "09170000001", address: "" });

  expect(prisma.client.create).toHaveBeenCalledWith({
    data: { name: "Alice", email: undefined, phone_number: "09170000001", address: undefined },
    select: { id: true, name: true },
  });
});

it("createClient passes provided optional fields through", async () => {
  await createClient({
    name: "Alice",
    email: "alice@email.com",
    phone_number: "09170000001",
    address: "123 Rizal St.",
  });

  expect(prisma.client.create).toHaveBeenCalledWith({
    data: {
      name: "Alice",
      email: "alice@email.com",
      phone_number: "09170000001",
      address: "123 Rizal St.",
    },
    select: { id: true, name: true },
  });
});

it("updateClient passes provided fields through and does not null phone_number", async () => {
  await updateClient({
    clientId: uuid,
    name: "Alice",
    email: "",
    phone_number: "09170000001",
    address: "",
  });

  expect(prisma.client.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { name: "Alice", email: null, phone_number: "09170000001", address: null },
    select: { id: true, name: true },
  });
});

it("updateClient passes provided fields through", async () => {
  await updateClient({
    clientId: uuid,
    name: "Alice",
    email: "alice@email.com",
    phone_number: "09170000001",
    address: "123 Rizal St.",
  });

  expect(prisma.client.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      name: "Alice",
      email: "alice@email.com",
      phone_number: "09170000001",
      address: "123 Rizal St.",
    },
    select: { id: true, name: true },
  });
});
