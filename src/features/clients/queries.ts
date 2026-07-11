import { prisma } from "@/lib/prisma";

export interface ClientEditData {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
}

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
