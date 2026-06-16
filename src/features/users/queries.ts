import { cache } from "react";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  is_active: true,
  created_at: true,
} as const;

export const getUserById = cache(async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      is_active: true,
    },
  });
});

export const countActiveAdminsAndDevs = cache(async (excludeUserId?: string) => {
  return prisma.user.count({
    where: {
      is_active: true,
      role: { in: [Role.Admin, Role.Dev] },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
});

export const getUserByEmail = cache(async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      is_active: true,
    },
  });
});

export const getUsers = cache(async () => {
  return prisma.user.findMany({
    orderBy: { created_at: "desc" },
    select: userSelect,
  });
});

export const getUsersPaginated = cache(
  async ({
    search = "",
    cursor,
    pageSize = 20,
    includeInactive = false,
  }: {
    search?: string;
    cursor?: string;
    pageSize?: number;
    includeInactive?: boolean;
  }) => {
    const baseFilter = includeInactive ? {} : { is_active: true };

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const where = { ...baseFilter, ...searchFilter };

    const users = await prisma.user.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy: { created_at: "desc" },
      select: userSelect,
    });

    const hasMore = users.length > pageSize;
    if (hasMore) users.pop();

    return {
      users,
      nextCursor: hasMore ? users[users.length - 1].id : null,
    };
  },
);
