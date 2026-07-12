import { z } from "zod";

import { CREATABLE_ROLES } from "@/features/users/constants";
import { Role } from "@/generated/prisma/client";
import { SortQuerySchema } from "@/lib/schemas";

export const UserPageQuerySchema = z.object({
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const CreateUserSchema = z.object({
  email: z.email().trim().min(1).max(255),
  role: z.enum(Role).refine((r) => CREATABLE_ROLES.includes(r), {
    message: "Role is not creatable",
  }),
});

export const UpdateUserSchema = z.object({
  userId: z.uuid(),
  email: z.email().trim().min(1).max(255),
  role: z.enum(Role).refine((r) => CREATABLE_ROLES.includes(r), {
    message: "Role is not creatable",
  }),
});

export const DeactivateUserSchema = z.object({
  userId: z.uuid(),
});
