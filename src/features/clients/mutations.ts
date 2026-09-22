import type { TransactionClient } from "@/lib/prisma";

import type { EmbeddedClientData, EmbeddedClientUpdatePayload } from "./schemas";

export async function createEmbeddedClient(
  tx: TransactionClient,
  data: EmbeddedClientData,
): Promise<{ id: string }> {
  const { name, email, phone_number, address } = data;

  return tx.client.create({
    data: {
      name,
      email: email || undefined,
      phone_number,
      address: address || undefined,
    },
    select: { id: true },
  });
}

export async function updateEmbeddedClient(
  tx: TransactionClient,
  payload: EmbeddedClientUpdatePayload,
): Promise<{ id: string }> {
  const { clientId, client } = payload;
  const { name, email, phone_number, address } = client;

  return tx.client.update({
    where: { id: clientId },
    data: {
      name,
      email: email ?? null,
      phone_number,
      address: address ?? null,
    },
    select: { id: true },
  });
}
