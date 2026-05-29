import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function upsertDeveloperUser(email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: Role.Dev,
      is_active: true,
    },
  });
}
