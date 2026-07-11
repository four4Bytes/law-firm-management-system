import { describe, expect, it, vi } from "vitest";

import { Client } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import { getClientForEdit } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: { findUnique: vi.fn() },
  },
}));

const clientRecord: Client = {
  id: "1",
  name: "Alice Client",
  email: "alice@email.com",
  phone_number: "09170000001",
  address: "123 Rizal St.",
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-06-01"),
};

describe("getClientForEdit", () => {
  it("returns the mapped client edit data", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(clientRecord);

    const result = await getClientForEdit("1");

    expect(result).toEqual(clientRecord);
    expect(prisma.client.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      select: { id: true, name: true, email: true, phone_number: true, address: true },
    });
  });

  it("returns null when the client is not found", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);

    const result = await getClientForEdit("1");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.client.findUnique).mockRejectedValue(error);

    await expect(getClientForEdit("1")).rejects.toThrow(error);
  });
});
