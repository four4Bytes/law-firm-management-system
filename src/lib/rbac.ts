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
 * @param admin        - Qualifier for {@link Role.Admin}.
 * @param branchManager - Qualifier for {@link Role.BranchManager}.
 * @param lawyer       - Qualifier for {@link Role.Lawyer}.
 * @param paralegal    - Qualifier for {@link Role.Paralegal}.
 * @param processServer - Qualifier for {@link Role.ProcessServer}.
 * @returns A full `Role` → qualifier row for the matrix.
 */
const cells = (
  admin: AccessQualifier,
  branchManager: AccessQualifier,
  lawyer: AccessQualifier,
  paralegal: AccessQualifier,
  processServer: AccessQualifier,
): Record<Role, AccessQualifier> => ({
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
  "user.create": cells("yes", "no", "no", "no", "no"),
  "user.read": cells("yes", "yes", "yes", "yes", "yes"),
  "user.update": cells("yes", "no", "no", "no", "no"),
  "user.delete": cells("yes", "no", "no", "no", "no"),

  "case.create": cells("yes", "yes", "yes", "no", "no"),
  "case.read": cells("yes", "yes", "yes", "assigned", "assigned"),
  "case.update": cells("yes", "yes", "assigned-or-own", "no", "no"),
  "case.delete": cells("yes", "yes", "own", "no", "no"),

  "consultation.create": cells("yes", "yes", "yes", "no", "no"),
  "consultation.read": cells("yes", "yes", "yes", "assigned", "assigned"),
  "consultation.update": cells("yes", "yes", "assigned-or-own", "no", "no"),
  "consultation.delete": cells("yes", "yes", "own", "no", "no"),

  "task.create": cells("yes", "yes", "assigned-or-own", "assigned", "no"),
  "task.read": cells("yes", "yes", "assigned-or-own", "assigned", "assigned"),
  "task.update": cells(
    "yes",
    "yes",
    "assigned-or-own",
    "assigned-task-only-or-own",
    "assigned-task-only",
  ),
  "task.delete": cells("yes", "yes", "assigned-or-own", "assigned-and-own", "no"),

  "payment.create": cells("yes", "yes", "no", "no", "no"),
  "payment.read": cells("yes", "yes", "no", "no", "no"),
  "payment.update": cells("yes", "yes", "no", "no", "no"),
  "payment.delete": cells("yes", "yes", "no", "no", "no"),

  "note.create": cells("yes", "yes", "assigned-or-own", "assigned", "assigned"),
  "note.read": cells("yes", "yes", "assigned-or-own", "assigned", "assigned"),
  "note.update": cells("yes", "yes", "assigned-or-own", "assigned-and-own", "assigned-and-own"),
  "note.delete": cells("yes", "yes", "assigned-or-own", "assigned-and-own", "assigned-and-own"),

  "milestone.create": cells("yes", "yes", "assigned-or-own", "no", "no"),
  "milestone.read": cells("yes", "yes", "assigned-or-own", "assigned", "assigned"),
  "milestone.update": cells("yes", "yes", "assigned-or-own", "no", "no"),
  "milestone.delete": cells("yes", "yes", "assigned-or-own", "no", "no"),

  "attachment.create": cells("yes", "yes", "assigned-or-own", "assigned", "assigned"),
  "attachment.read": cells("yes", "yes", "assigned-or-own", "assigned", "assigned"),
  "attachment.delete": cells("yes", "yes", "assigned-or-own", "own", "own"),
  "consultation.attachment.delete": cells(
    "yes",
    "yes",
    "assigned-or-own",
    "assigned-and-own",
    "assigned-and-own",
  ),

  "activity.read": cells("yes", "yes", "no", "no", "no"),
  "case.activity.read": cells("yes", "yes", "assigned", "assigned", "assigned"),
  "consultation.activity.read": cells("yes", "yes", "assigned-or-own", "assigned", "assigned"),
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
