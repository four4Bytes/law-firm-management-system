import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Client } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import { createClientAction, getClientForEditAction, updateClientAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const clientRecord: Client = {
  id: "1",
  name: "Alice Client",
  email: "alice@email.com",
  phone_number: "09170000001",
  address: "123 Rizal St.",
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-06-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createClientAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await createClientAction({})).toEqual({
      success: false,
      error: "Invalid client data",
    });
  });

  it("creates a client and revalidates the list", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(clientRecord);

    const result = await createClientAction({ name: "Alice Client" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "1", name: "Alice Client" });
    expect(prisma.client.create).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/client");
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(prisma.client.create).mockRejectedValue(new Error("db error"));

    expect(await createClientAction({ name: "Alice Client" })).toEqual({
      success: false,
      error: "Failed to create client",
    });
  });
});

describe("getClientForEditAction", () => {
  it("returns an error when id is missing", async () => {
    expect(await getClientForEditAction("")).toEqual({
      success: false,
      error: "Invalid client ID",
    });
  });

  it("returns an error when the client is not found", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);

    expect(await getClientForEditAction(uuid)).toEqual({
      success: false,
      error: "Client not found",
    });
  });

  it("returns the client edit data", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(clientRecord);

    const result = await getClientForEditAction(uuid);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "1", name: "Alice Client" });
  });

  it("returns an error when loading the client throws", async () => {
    vi.mocked(prisma.client.findUnique).mockRejectedValue(new Error("db error"));

    expect(await getClientForEditAction(uuid)).toEqual({
      success: false,
      error: "Failed to load client",
    });
  });
});

describe("updateClientAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await updateClientAction({ id: uuid })).toEqual({
      success: false,
      error: "Invalid client data",
    });
  });

  it("updates a client and revalidates the list", async () => {
    vi.mocked(prisma.client.update).mockResolvedValue(clientRecord);

    const result = await updateClientAction({ id: uuid, name: "Alice Client" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "1", name: "Alice Client" });
    expect(prisma.client.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/client");
  });

  it("returns an error when update fails", async () => {
    vi.mocked(prisma.client.update).mockRejectedValue(new Error("db error"));

    expect(await updateClientAction({ id: uuid, name: "Alice Client" })).toEqual({
      success: false,
      error: "Failed to update client",
    });
  });
});
