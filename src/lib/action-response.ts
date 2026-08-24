/**
 * Standard envelopes and structured error payloads returned by write Server
 * Actions (create/update/delete).
 *
 * This module is pure and client-safe: it imports nothing server-only, so the
 * factories can be reused by client components that need to render matching
 * toast content optimistically.
 *
 * @module lib/action-response
 */

import { TASK_LOCKED_MESSAGE } from "@/lib/errors";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";

/** Machine-readable failure category carried by every {@link ActionError}. */
export type ActionErrorCode =
  "unauthorized" | "forbidden" | "not_found" | "validation" | "conflict" | "locked" | "unknown";

/**
 * Structured, user-facing error payload.
 *
 * `title` is a short sentence-case label (no trailing period) used as the
 * toast headline; `description` is always present and explains what happened
 * plus what to do next.
 */
export interface ActionError {
  code: ActionErrorCode;
  /** Short toast headline. */
  title: string;
  /** Full-sentence explanation with a next step. Always rendered. */
  description: string;
}

/** Standard envelope returned by write Server Actions. */
export interface ActionStatusResponse {
  /** Whether the action completed successfully. */
  success: boolean;
  /** Structured error surfaced to the client when `success` is false. */
  error?: ActionError;
}

/**
 * Status envelope that additionally carries an optionally typed success payload.
 *
 * @typeParam T - The shape of the payload carried on success.
 */
export interface ActionDataResponse<T> extends ActionStatusResponse {
  /** Payload returned to the caller on success (e.g. the persisted record). */
  data?: T;
}

/**
 * Builds a failed {@link ActionStatusResponse} from explicit error parts.
 *
 * @param code - Machine-readable failure category.
 * @param title - Short user-facing headline.
 * @param description - Full-sentence explanation; always rendered in UI.
 * @returns A failed response envelope.
 */
export function actionError(
  code: ActionErrorCode,
  title: string,
  description: string,
): ActionStatusResponse {
  return { success: false, error: { code, title, description } };
}

/**
 * Failure preset for denied write actions (context-free or record-scoped).
 *
 * @returns A forbidden response using the shared RBAC denial message.
 */
export function actionForbidden(): ActionStatusResponse {
  return actionError("forbidden", "Access denied", FORBIDDEN_MESSAGE);
}

/**
 * Failure preset for mutations targeting a missing record.
 *
 * @param entity - Human-readable entity name (e.g. `"Case"`).
 * @returns A not-found response.
 */
export function actionNotFound(entity: string): ActionStatusResponse {
  return actionError(
    "not_found",
    `${entity} not found`,
    `The ${entity.toLowerCase()} may have been deleted by another user.`,
  );
}

/**
 * Failure preset for rejected Zod validation at the action boundary. This
 * indicates a client bypassed form-level validation, so the copy stays generic.
 *
 * @param entity - Human-readable entity name (e.g. `"case"`).
 * @returns A validation response.
 */
export function actionInvalid(entity: string): ActionStatusResponse {
  return actionError(
    "validation",
    `Invalid ${entity} data`,
    "Some fields are missing or malformed. Review your input and try again.",
  );
}

/**
 * Failure preset for uniqueness or state conflicts (e.g. Prisma P2002).
 *
 * @param title - Short conflict headline.
 * @param description - Explanation of which constraint was violated.
 * @returns A conflict response.
 */
export function actionConflict(title: string, description: string): ActionStatusResponse {
  return actionError("conflict", title, description);
}

/**
 * Failure preset for write-locked records (e.g. cancelled task attachments).
 *
 * @returns A locked response using the shared task-lock message.
 */
export function actionLocked(): ActionStatusResponse {
  return actionError("locked", "Task locked", TASK_LOCKED_MESSAGE);
}

const UNAUTHORIZED_TITLE = "Session expired";
const UNAUTHORIZED_DESCRIPTION = "Please sign in again to continue.";

/**
 * Failure preset for actions invoked without a verified session.
 *
 * @returns An unauthorized response.
 */
export function actionUnauthorized(): ActionStatusResponse {
  return actionError("unauthorized", UNAUTHORIZED_TITLE, UNAUTHORIZED_DESCRIPTION);
}

/**
 * Fallback content for unrecoverable failures where the server could not
 * classify the cause. Used by both the catch mapper and client helpers when
 * an envelope arrives without an error payload.
 *
 * @param operation - Verb phrase describing the attempted operation
 *   (e.g. `"update case"`, rendered as `"Failed to update case"`).
 * @returns Structured unknown-error content.
 */
export function unknownActionError(operation: string): ActionError {
  return {
    code: "unknown",
    title: `Failed to ${operation}`,
    description: "Something went wrong on our end. Please try again.",
  };
}
