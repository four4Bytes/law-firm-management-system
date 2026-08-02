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
