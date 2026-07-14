import { cache } from "react";

import { Role, type User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { PageQuery } from "@/lib/types";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  is_active: true,
  created_at: true,
} as const;

export const getUserById = cache(
  async (
    id: string,
  ): Promise<{
    id: string;
    role: Role | null;
    is_active: boolean;
  } | null> => {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        is_active: true,
      },
    });
  },
);

export const countActiveAdminsAndDevs = cache(async (excludeUserId?: string): Promise<number> => {
  return prisma.user.count({
    where: {
      is_active: true,
      role: { in: [Role.Admin, Role.Dev] },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
});

export const getUserByEmail = cache(
  async (
    email: string,
  ): Promise<{
    id: string;
    role: Role | null;
    is_active: boolean;
  } | null> => {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        is_active: true,
      },
    });
  },
);

export const getUsers = cache(async (): Promise<UserRow[]> => {
  return prisma.user.findMany({
    orderBy: { created_at: "desc" },
    select: userSelect,
  });
});

export type UserRow = Pick<User, "id" | "name" | "email" | "role" | "is_active" | "created_at">;

export interface UserPageQuery extends PageQuery {
  includeInactive?: boolean;
}

export const getUsersPaginated = cache(
  async ({
    search = "",
    cursor,
    pageSize = 20,
    includeInactive = false,
    sort,
  }: UserPageQuery): Promise<{
    users: UserRow[];
    nextCursor: string | null;
  }> => {
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

    const defaultOrderBy = { created_at: "desc" } as const;

    const orderBy =
      sort?.column === "name"
        ? [{ name: sort.direction }, { id: "asc" as const }]
        : sort?.column === "email"
          ? [{ email: sort.direction }, { id: "asc" as const }]
          : sort?.column === "role"
            ? [{ role: sort.direction }, { id: "asc" as const }]
            : defaultOrderBy;

    const users = await prisma.user.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
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
