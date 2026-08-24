/**
 * Minimal server-side structured logger.
 *
 * All unclassified failures caught inside Server Actions flow through
 * {@link logError} so the cause is never silently discarded — the client only
 * ever receives the sanitized {@link ActionError} envelope, while the full
 * error (message + stack) stays in server logs.
 *
 * @module lib/logger
 */

/**
 * Formats an unknown thrown value into a single loggable string.
 *
 * @param error - Anything caught by a `catch` clause.
 * @returns The message plus stack trace when available.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }
  return String(error);
}

/**
 * Logs a failure with a stable `[context]` prefix for grep-able server logs.
 *
 * @param context - Short operation tag (e.g. `"cases.create"`).
 * @param error - The caught value to record.
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, formatError(error));
}

/**
 * Logs a recoverable, non-fatal condition with a stable `[context]` prefix.
 *
 * @param context - Short operation tag (e.g. `"storage.cleanup"`).
 * @param message - Human-readable description of the condition.
 */
export function logWarn(context: string, message: string): void {
  console.warn(`[${context}] ${message}`);
}
