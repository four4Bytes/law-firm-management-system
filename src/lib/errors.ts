/**
 * Custom error classes for the application.
 *
 * @module lib/errors
 */

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
