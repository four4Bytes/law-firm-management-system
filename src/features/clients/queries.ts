import { prisma } from "@/lib/prisma";
import type { Client } from "@/generated/prisma/browser";

export type ClientEditData = Pick<Client, "id" | "name" | "email" | "phone_number" | "address">;

export const getClientForEdit = async (id: string): Promise<ClientEditData | null> => {
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone_number: true,
      address: true,
    },
  });

  return client;
};
