import { beforeEach, describe, expect, it, vi } from "vitest";

import { Client } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";

import { getClientForEditAction } from "../actions";

vi.mock("@/lib/security/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("@/lib/infra/prisma", () => ({
  prisma: {
    client: { findUnique: vi.fn() },
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

describe("getClientForEditAction", () => {
  it("throws when id is missing", async () => {
    await expect(getClientForEditAction("")).rejects.toThrow("Invalid client ID");
  });

  it("returns null when the client is not found", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);

    expect(await getClientForEditAction(uuid)).toBeNull();
  });

  it("returns the client edit data", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(clientRecord);

    const result = await getClientForEditAction(uuid);

    expect(result).toMatchObject({ id: "1", name: "Alice Client" });
  });

  it("throws when loading the client fails", async () => {
    vi.mocked(prisma.client.findUnique).mockRejectedValue(new Error("db error"));

    await expect(getClientForEditAction(uuid)).rejects.toThrow();
  });
});
