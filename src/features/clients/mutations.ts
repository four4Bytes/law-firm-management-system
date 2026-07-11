import { prisma } from "@/lib/prisma";

import type { ClientCreatePayload, ClientUpdatePayload } from "./schemas";

export async function createClient(data: ClientCreatePayload) {
  return prisma.client.create({
    data: {
      name: data.name,
      email: data.email || undefined,
      phone_number: data.phone_number || undefined,
      address: data.address || undefined,
    },
    select: { id: true, name: true },
  });
}

export async function updateClient(data: ClientUpdatePayload) {
  return prisma.client.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email || undefined,
      phone_number: data.phone_number || undefined,
      address: data.address || undefined,
    },
    select: { id: true, name: true },
  });
}
