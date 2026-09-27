/**
 * Helpers for awaiting several independent promises where a single failure must
 * not discard its siblings.
 *
 * @module lib/promise
 */

/**
 * Unwraps a settled promise, yielding `null` when it was rejected.
 *
 * Use with `Promise.allSettled` when parallel fetches feed one render and any
 * one of them may fail independently — the rejected branch degrades to `null`
 * instead of rejecting the whole batch and taking the page down with it.
 *
 * @param result - A settled result from `Promise.allSettled`.
 * @returns The fulfilled value, or `null` if the promise rejected.
 */
export function fulfilledOrNull<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}
