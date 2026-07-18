import { z } from "zod";

import { CREATABLE_ROLES } from "@/features/users/constants";
import { Role } from "@/generated/prisma/browser";
import { emailText, requiredEnum } from "@/lib/form-utils";
import { SortQuerySchema } from "@/lib/schemas";

export const UserPageQuerySchema = z.object({
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

const CreatableRoleSchema = requiredEnum(Role, "Role").refine(
  (r) => (CREATABLE_ROLES as readonly Role[]).includes(r),
  { message: "Role is not creatable" },
);

export const CreateUserSchema = z.object({
  email: emailText("Email"),
  role: CreatableRoleSchema,
});

export const UpdateUserSchema = z.object({
  userId: z.uuid(),
  email: emailText("Email"),
  role: CreatableRoleSchema,
});

export const DeactivateUserSchema = z.object({
  userId: z.uuid(),
});
