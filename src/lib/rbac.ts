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
 *   Task-only rights also require parent case assignment (see EVALUATORS,
 *   mirroring RBAC.md's `ASSIGNED + TASK_ONLY` rule).
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
  "assigned-task-only": (context) => context.assigned === true && context.taskOnly === true,
  "assigned-task-only-or-own": (context) =>
    (context.assigned === true && context.taskOnly === true) || context.own === true,
};

/**
 * Qualifier set for one matrix row, keyed by the five standard roles.
 */
interface RoleCells {
  admin: AccessQualifier;
  branchManager: AccessQualifier;
  lawyer: AccessQualifier;
  paralegal: AccessQualifier;
  processServer: AccessQualifier;
}

/**
 * Builds a matrix row for the five standard roles. Dev is not part of the
 * documented tables — it is a bootstrap superuser, so it is always `yes`.
 *
 * @param cells - Qualifier per role for the row.
 * @returns A full `Role` → qualifier row for the matrix.
 */
const cells = ({
  admin,
  branchManager,
  lawyer,
  paralegal,
  processServer,
}: RoleCells): Record<Role, AccessQualifier> => ({
  Dev: "yes",
  Admin: admin,
  BranchManager: branchManager,
  Lawyer: lawyer,
  Paralegal: paralegal,
  ProcessServer: processServer,
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
    admin: "yes",
    branchManager: "no",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),
  "user.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "yes",
    paralegal: "yes",
    processServer: "yes",
  }),
  "user.update": cells({
    admin: "yes",
    branchManager: "no",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),
  "user.delete": cells({
    admin: "yes",
    branchManager: "no",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),

  "case.create": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "yes",
    paralegal: "no",
    processServer: "no",
  }),
  "case.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "yes",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "case.update": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "no",
    processServer: "no",
  }),
  "case.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "own",
    paralegal: "no",
    processServer: "no",
  }),

  "consultation.create": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "yes",
    paralegal: "no",
    processServer: "no",
  }),
  "consultation.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "yes",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "consultation.update": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "no",
    processServer: "no",
  }),
  "consultation.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "own",
    paralegal: "no",
    processServer: "no",
  }),

  "task.create": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "no",
  }),
  "task.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "task.update": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned-task-only-or-own",
    processServer: "assigned-task-only",
  }),
  "task.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned-and-own",
    processServer: "no",
  }),

  "payment.create": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),
  "payment.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),
  "payment.update": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),
  "payment.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),

  "note.create": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "note.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "note.update": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned-and-own",
    processServer: "assigned-and-own",
  }),
  "note.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned-and-own",
    processServer: "assigned-and-own",
  }),

  "milestone.create": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "no",
    processServer: "no",
  }),
  "milestone.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "milestone.update": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "no",
    processServer: "no",
  }),
  "milestone.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "no",
    processServer: "no",
  }),

  "attachment.create": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "attachment.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "attachment.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "own",
    processServer: "own",
  }),
  "consultation.attachment.delete": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned-and-own",
    processServer: "assigned-and-own",
  }),

  "activity.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "no",
    paralegal: "no",
    processServer: "no",
  }),
  "case.activity.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned",
    paralegal: "assigned",
    processServer: "assigned",
  }),
  "consultation.activity.read": cells({
    admin: "yes",
    branchManager: "yes",
    lawyer: "assigned-or-own",
    paralegal: "assigned",
    processServer: "assigned",
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
 * Returns `false` for `null`/`undefined` roles, or for role values not present
 * in the {@link Role} enum (unrecognized roles deny permission).
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

  const rolePermissions = PERMISSION_MATRIX[permission];
  if (!rolePermissions || !(role in rolePermissions)) {
    return false;
  }

  const qualifier = rolePermissions[role as Role];
  return EVALUATORS[qualifier](context);
}
