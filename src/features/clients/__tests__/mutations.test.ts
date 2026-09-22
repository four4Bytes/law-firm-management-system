import { describe, expect, it, vi } from "vitest";

import type { TransactionClient } from "@/lib/infra/prisma";

import { createEmbeddedClient, updateEmbeddedClient } from "../mutations";
import type { EmbeddedClientData } from "../schemas";

function setupTx() {
  const tx = {
    client: { create: vi.fn(), update: vi.fn() },
  };
  return tx as unknown as TransactionClient;
}

function mockTxClient(tx: TransactionClient) {
  return tx.client as unknown as {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

const clientData: EmbeddedClientData = {
  name: "Alice Client",
  phone_number: "09170000001",
};

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("createEmbeddedClient", () => {
  it("creates the client and returns its id", async () => {
    const tx = setupTx();
    mockTxClient(tx).create.mockResolvedValue({ id: "c1" });

    const result = await createEmbeddedClient(tx, {
      ...clientData,
      email: "alice@email.com",
      address: "123 Rizal St.",
    });

    expect(result).toEqual({ id: "c1" });
    expect(mockTxClient(tx).create).toHaveBeenCalledWith({
      data: {
        name: "Alice Client",
        email: "alice@email.com",
        phone_number: "09170000001",
        address: "123 Rizal St.",
      },
      select: { id: true },
    });
  });

  it("maps missing optional fields to undefined", async () => {
    const tx = setupTx();
    mockTxClient(tx).create.mockResolvedValue({ id: "c1" });

    await createEmbeddedClient(tx, clientData);

    expect(mockTxClient(tx).create).toHaveBeenCalledWith({
      data: {
        name: "Alice Client",
        email: undefined,
        phone_number: "09170000001",
        address: undefined,
      },
      select: { id: true },
    });
  });
});

describe("updateEmbeddedClient", () => {
  it("updates the client and returns its id", async () => {
    const tx = setupTx();
    mockTxClient(tx).update.mockResolvedValue({ id: uuid });

    const result = await updateEmbeddedClient(tx, {
      client: {
        ...clientData,
        email: "alice@email.com",
        address: "123 Rizal St.",
      },
      clientId: uuid,
    });

    expect(result).toEqual({ id: uuid });
  });

  it("clears optional fields to null when omitted", async () => {
    const tx = setupTx();
    mockTxClient(tx).update.mockResolvedValue({ id: uuid });

    await updateEmbeddedClient(tx, {
      client: clientData,
      clientId: uuid,
    });

    expect(mockTxClient(tx).update).toHaveBeenCalledWith({
      where: { id: uuid },
      data: {
        name: "Alice Client",
        email: null,
        phone_number: "09170000001",
        address: null,
      },
      select: { id: true },
    });
  });

  it("passes provided optional fields through", async () => {
    const tx = setupTx();
    mockTxClient(tx).update.mockResolvedValue({ id: uuid });

    await updateEmbeddedClient(tx, {
      client: {
        ...clientData,
        email: "alice@email.com",
        address: "123 Rizal St.",
      },
      clientId: uuid,
    });

    expect(mockTxClient(tx).update).toHaveBeenCalledWith({
      where: { id: uuid },
      data: {
        name: "Alice Client",
        email: "alice@email.com",
        phone_number: "09170000001",
        address: "123 Rizal St.",
      },
      select: { id: true },
    });
  });
});
