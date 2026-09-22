import { cache } from "react";

import type { Client } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";

export type ClientEditData = Pick<Client, "id" | "name" | "email" | "phone_number" | "address">;

export const getClientForEdit = cache(async (id: string): Promise<ClientEditData | null> => {
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
});
