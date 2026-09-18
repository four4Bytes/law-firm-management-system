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
  actionRecordLocked,
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
 * task is `Done`. A done task is terminal, so its attachments are
 * write-locked (create/update/delete refused).
 */
export class TaskLockedError extends Error {
  /** Stable identifier for error boundary detection. */
  readonly digest = "TASK_LOCKED";

  constructor() {
    super("This task is done and its attachments are locked");
    this.name = "TaskLockedError";
  }
}

/**
 * Message returned when a mutation targets a Note or Document whose parent
 * task is `Done`. A done task is terminal, so its attachments are
 * write-locked (create/update/delete refused).
 */
export const TASK_LOCKED_MESSAGE = "This task is done and its attachments are locked";

export class TaskValidationError extends Error {
  readonly digest = "TASK_VALIDATION";
  readonly title: string;
  readonly description: string;

  constructor(title: string, description: string) {
    super(description);
    this.name = "TaskValidationError";
    this.title = title;
    this.description = description;
  }
}

/**
 * Error thrown when mutating notes or files on a terminal consultation or
 * case. Terminal records are append-only: new notes and files are welcome,
 * but existing ones can no longer be edited or deleted.
 */
export class RecordLockedError extends Error {
  /** Stable identifier for error boundary detection. */
  readonly digest = "RECORD_LOCKED";

  /** Human-readable entity name used in the user-facing message. */
  readonly entity: string;

  constructor(entity: string) {
    super(`${entity} is locked`);
    this.name = "RecordLockedError";
    this.entity = entity;
  }
}

/**
 * Error thrown when a compare-and-set status update affects zero rows because
 * another transition won the race. Mapped to a conflict envelope telling the
 * user to refresh and retry.
 */
export class StatusConflictError extends Error {
  /** Stable identifier for error boundary detection. */
  readonly digest = "STATUS_CONFLICT";

  constructor() {
    super("Record changed by another user");
    this.name = "StatusConflictError";
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
  if (error instanceof RecordLockedError) return actionRecordLocked(error.entity);
  if (error instanceof TaskValidationError) {
    return actionConflict(error.title, error.description);
  }
  if (error instanceof StatusConflictError) {
    return actionConflict(
      "Record changed",
      "Another user changed this record just now. Refresh the page and try again.",
    );
  }
  if ((error as { code?: string } | null)?.code === "P2002" && conflict) {
    return actionConflict(conflict.title, conflict.description);
  }
  logError(operation, error);
  return { success: false, error: unknownActionError(operation) };
}
