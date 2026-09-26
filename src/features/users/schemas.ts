import { z } from "zod";

import { CREATABLE_ROLES } from "@/features/users/constants";
import { Role } from "@/generated/prisma/browser";
import { emailText, requiredEnum } from "@/lib/validation/form-utils";
import { enumFilterParamSchema, SortQuerySchema } from "@/lib/validation/schemas";

export const UserListQuerySchema = z.object({
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
  filters: z
    .object({
      role: z.array(z.enum(Role)).max(10).optional(),
    })
    .optional(),
});

// `?role=` deep-link into a pre-filtered user list. Unknown values are dropped
// so a hand-crafted URL never breaks the page.
export const UserRoleFilterParamSchema = enumFilterParamSchema(Object.values(Role));

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
