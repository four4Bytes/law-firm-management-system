import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface UserUpdatePayload {
  email?: string;
  role?: Role;
  is_active?: boolean;
}

export async function upsertDeveloperUser(
  email: string,
  name: string,
  image?: string | null,
): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: Role | null;
  is_active: boolean;
}> {
  return prisma.user.upsert({
    where: { email },
    update: { name, image },
    create: {
      email,
      name,
      image,
      role: Role.Dev,
      is_active: true,
    },
  });
}

export async function createUser(email: string, role: Role): Promise<{ id: string }> {
  return prisma.user.create({
    data: {
      email,
      name: "New User",
      role,
      is_active: true,
    },
    select: { id: true },
  });
}

export async function syncUserFromGoogle(
  email: string,
  name: string,
  image?: string | null,
): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: { name, image },
  });
}

export async function updateUser(id: string, data: UserUpdatePayload): Promise<void> {
  await prisma.user.update({
    where: { id },
    data,
  });
}

export async function setUserActiveStatus(id: string, isActive: boolean): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { is_active: isActive },
  });
}
