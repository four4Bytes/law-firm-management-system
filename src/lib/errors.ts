/**
 * Custom error classes and the shared catch-block mapper for Server Actions.
 *
 * Uses a stable `digest` property so error boundaries can reliably identify
 * each class without depending on the `message` string.
 *
 * @module lib/errors
 */

import {
  actionConflict,
  actionForbidden,
  actionLocked,
  actionUnauthorized,
  unknownActionError,
  type ActionStatusResponse,
} from "@/lib/action-response";
import { logError } from "@/lib/logger";

/**
 * Error thrown when a user lacks permission for an action.
 *
 * Uses a stable `digest` property so error boundaries can reliably identify
 * forbidden access without depending on the `message` string.
 */
export class ForbiddenError extends Error {
  /** Stable identifier for error boundary detection. */
  readonly digest = "FORBIDDEN";

  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

/**
 * Error thrown when authentication is required but missing.
 *
 * Uses a stable `digest` property so error boundaries can reliably identify
 * unauthorized access without depending on the `message` string.
 */
export class UnauthorizedError extends Error {
  /** Stable identifier for error boundary detection. */
  readonly digest = "UNAUTHORIZED";

  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Error thrown when a mutation targets a Note or Document whose parent
 * task is `Cancelled`. A cancelled task is terminal, so its attachments are
 * write-locked (create/update/delete refused).
 */
export class TaskLockedError extends Error {
  /** Stable identifier for error boundary detection. */
  readonly digest = "TASK_LOCKED";

  constructor() {
    super("This task is cancelled and its attachments are locked");
    this.name = "TaskLockedError";
  }
}

/**
 * Message returned when a mutation targets a Note or Document whose parent
 * task is `Cancelled`. A cancelled task is terminal, so its attachments are
 * write-locked (create/update/delete refused).
 */
export const TASK_LOCKED_MESSAGE = "This task is cancelled and its attachments are locked";

/**
 * Error thrown by a status-transition mutation when the target task is
 * already `Cancelled`. Cancelled is terminal, so cancel and reopen requests
 * that raced past the pre-read are refused under the row lock.
 */
export class TaskCancelledError extends Error {
  /** Stable identifier for error boundary detection. */
  readonly digest = "TASK_CANCELLED";

  constructor() {
    super("This task has already been cancelled");
    this.name = "TaskCancelledError";
  }
}

/** Conflict copy supplied by the caller when a P2002 violation is domain-specific. */
interface ConflictCopy {
  /** Short headline (e.g. `"Case already exists"`). */
  title: string;
  /** Explanation of which constraint was violated. */
  description: string;
}

/**
 * Maps an unknown caught value to a structured {@link ActionStatusResponse}.
 *
 * Expected, classified failures (`ForbiddenError`, `UnauthorizedError`,
 * `TaskLockedError`) convert to their matching presets without logging.
 * Prisma `P2002` unique violations map to a conflict when the caller supplies
 * {@link ConflictCopy}. Everything else is logged via `logError` and returned
 * as a sanitized unknown-error envelope — raw exceptions never reach the client.
 *
 * @param error - The value caught in a Server Action `catch` block.
 * @param operation - Verb phrase for the fallback title
 *   (e.g. `"update case"` → `"Failed to update case"`).
 * @param conflict - Optional copy used when the error is a P2002 violation.
 * @returns A structured failed response safe to return to the client.
 */
export function toActionResponse(
  error: unknown,
  operation: string,
  conflict?: ConflictCopy,
): ActionStatusResponse {
  if (error instanceof ForbiddenError) return actionForbidden();
  if (error instanceof UnauthorizedError) return actionUnauthorized();
  if (error instanceof TaskLockedError) return actionLocked();
  if ((error as { code?: string } | null)?.code === "P2002" && conflict) {
    return actionConflict(conflict.title, conflict.description);
  }
  logError(operation, error);
  return { success: false, error: unknownActionError(operation) };
}
