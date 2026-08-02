/**
 * Centralized RBAC policy for the application.
 *
 * This module mirrors `documentation/RBAC.md` — the permission matrix is the
 * single source of truth for what each role may do. When the client requests
 * a policy change, edit the affected cell in {@link PERMISSION_MATRIX} here
 * and in the documentation; every layer (server actions, client UI, sidebar
 * nav, tests) reads this same object.
 *
 * The module is pure and client-safe: it imports only Prisma enum types, so
 * it can be imported from `"use client"` components and Server Actions alike.
 */

import type { Role } from "@/generated/prisma/browser";

/** Shared user-facing message for denied write actions. */
export const FORBIDDEN_MESSAGE = "You don't have permission to perform this action.";

/**
 * Policy cell qualifiers used by the permission matrix. Mirrors the access
 * legend in `documentation/RBAC.md` (`YES`, `NO`, `ASSIGNED`, `OWN`, and the
 * combined rules).
 */
export type AccessQualifier =
  | "yes"
  | "no"
  | "assigned"
  | "own"
  | "assigned-or-own"
  | "assigned-and-own"
  | "assigned-task-only"
  | "assigned-task-only-or-own";

/**
 * Granular action a role may or may not perform on an entity.
 */
export type Permission =
  | "user.create"
  | "user.read"
  | "user.update"
  | "user.delete"
  | "case.create"
  | "case.read"
  | "case.update"
  | "case.delete"
  | "consultation.create"
  | "consultation.read"
  | "consultation.update"
  | "consultation.delete"
  | "task.create"
  | "task.read"
  | "task.update"
  | "task.delete"
  | "payment.create"
  | "payment.read"
  | "payment.update"
  | "payment.delete"
  | "note.create"
  | "note.read"
  | "note.update"
  | "note.delete"
  | "milestone.create"
  | "milestone.read"
  | "milestone.update"
  | "milestone.delete"
  | "attachment.create"
  | "attachment.read"
  | "attachment.delete"
  | "consultation.attachment.delete"
  | "activity.read"
  | "case.activity.read"
  | "consultation.activity.read";

/**
 * Runtime facts about the current user's relation to a specific record.
 *
 * - `assigned` — the user has a `CaseAssignment` / `ConsultationAssignment`
 *   for the record's parent case or consultation.
 * - `own`      — the user created the record (`created_by_user_id`), or
 *   uploaded it in the case of documents.
 * - `taskOnly` — the user is an assignee on the specific task
 *   (`TaskAssignment`); parent-case assignment alone does not count.
 */
export interface AccessContext {
  assigned?: boolean;
  own?: boolean;
  taskOnly?: boolean;
}

const EVALUATORS: Record<AccessQualifier, (context: AccessContext) => boolean> = {
  yes: () => true,
  no: () => false,
  assigned: (context) => context.assigned === true,
  own: (context) => context.own === true,
  "assigned-or-own": (context) => context.assigned === true || context.own === true,
  "assigned-and-own": (context) => context.assigned === true && context.own === true,
  "assigned-task-only": (context) => context.taskOnly === true,
  "assigned-task-only-or-own": (context) => context.taskOnly === true || context.own === true,
};

/**
 * Builds a matrix row for the five standard roles. Dev is not part of the
 * documented tables — it is a bootstrap superuser, so it is always `yes`
 * except for immutable log cells (which are `no` for every role).
 *
 * @param roles - Named object containing qualifiers for each role.
 * @param roles.Admin - Qualifier for {@link Role.Admin}.
 * @param roles.BranchManager - Qualifier for {@link Role.BranchManager}.
 * @param roles.Lawyer - Qualifier for {@link Role.Lawyer}.
 * @param roles.Paralegal - Qualifier for {@link Role.Paralegal}.
 * @param roles.ProcessServer - Qualifier for {@link Role.ProcessServer}.
 * @returns A full `Role` → qualifier row for the matrix.
 */
const cells = (roles: {
  Admin: AccessQualifier;
  BranchManager: AccessQualifier;
  Lawyer: AccessQualifier;
  Paralegal: AccessQualifier;
  ProcessServer: AccessQualifier;
}): Record<Role, AccessQualifier> => ({
  Dev: "yes",
  Admin: roles.Admin,
  BranchManager: roles.BranchManager,
  Lawyer: roles.Lawyer,
  Paralegal: roles.Paralegal,
  ProcessServer: roles.ProcessServer,
});

/**
 * The RBAC matrix, transposed cell-for-cell from the tables in
 * `documentation/RBAC.md`. Edit a cell here and in the doc together.
 *
 * `attachment.*` covers Case attachments; `consultation.attachment.delete`
 * covers Consultation attachments (their DELETE row differs for Paralegal and
 * Process Server).
 */
export const PERMISSION_MATRIX: Record<Permission, Record<Role, AccessQualifier>> = {
  "user.create": cells({
    Admin: "yes",
    BranchManager: "no",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "user.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "yes",
    Paralegal: "yes",
    ProcessServer: "yes",
  }),
  "user.update": cells({
    Admin: "yes",
    BranchManager: "no",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "user.delete": cells({
    Admin: "yes",
    BranchManager: "no",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),

  "case.create": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "yes",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "case.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "yes",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "case.update": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "case.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "own",
    Paralegal: "no",
    ProcessServer: "no",
  }),

  "consultation.create": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "yes",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "consultation.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "yes",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "consultation.update": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "consultation.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "own",
    Paralegal: "no",
    ProcessServer: "no",
  }),

  "task.create": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "no",
  }),
  "task.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "task.update": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned-task-only-or-own",
    ProcessServer: "assigned-task-only",
  }),
  "task.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned-and-own",
    ProcessServer: "no",
  }),

  "payment.create": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "payment.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "payment.update": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "payment.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),

  "note.create": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "note.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "note.update": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned-and-own",
    ProcessServer: "assigned-and-own",
  }),
  "note.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned-and-own",
    ProcessServer: "assigned-and-own",
  }),

  "milestone.create": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "milestone.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "milestone.update": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "milestone.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "no",
    ProcessServer: "no",
  }),

  "attachment.create": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "attachment.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "attachment.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "own",
    ProcessServer: "own",
  }),
  "consultation.attachment.delete": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned-and-own",
    ProcessServer: "assigned-and-own",
  }),

  "activity.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "no",
    Paralegal: "no",
    ProcessServer: "no",
  }),
  "case.activity.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
  "consultation.activity.read": cells({
    Admin: "yes",
    BranchManager: "yes",
    Lawyer: "assigned-or-own",
    Paralegal: "assigned",
    ProcessServer: "assigned",
  }),
};

/**
 * Evaluates whether a role may perform a permission, given the user's access
 * context on the specific record.
 *
 * Qualifier cells that require context (`assigned`, `own`, `taskOnly`) return
 * `false` when the corresponding context fact is missing or unset — use this
 * for directory-level checks where no record context exists yet.
 *
 * @param role       - The user's role (nullable, as it comes from the session).
 * @param permission - The granular action to evaluate.
 * @param context    - The user's relation to the target record, when known.
 * @returns `true` when the role is permitted under the given context.
 */
export function can(
  role: Role | null | undefined,
  permission: Permission,
  context: AccessContext = {},
): boolean {
  if (!role) return false;
  return EVALUATORS[PERMISSION_MATRIX[permission][role]](context);
}
