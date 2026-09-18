"use client";

import { useCallback, useRef, useState } from "react";

/** Pending-fetch lifecycle returned by {@link usePendingFetch}. */
export interface UsePendingFetchResult {
  /** Id of the in-flight fetch, or `null` when idle. */
  pendingId: string | null;
  /** Runs `task` under the pending id, returning `null` when superseded. */
  run: <T>(id: string, task: () => Promise<T>) => Promise<T | null>;
  /** Cancels any in-flight fetch without running a task. */
  clear: () => void;
}

/**
 * Tracks the in-flight id of a row-level fetch (e.g. loading a record into an
 * edit modal) and guards against out-of-order responses.
 *
 * Shared primitive for the `pendingEditId + latestRequest` race-guard pattern
 * used by the tab components (adopted in NotesTab so far).
 *
 * @returns The pending id plus `run` and `clear` helpers.
 */
export function usePendingFetch(): UsePendingFetchResult {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const run = useCallback(async <T>(id: string, task: () => Promise<T>): Promise<T | null> => {
    const requestId = ++latestRequest.current;
    setPendingId(id);
    try {
      const result = await task();
      if (requestId !== latestRequest.current) return null;
      return result;
    } finally {
      if (requestId === latestRequest.current) setPendingId(null);
    }
  }, []);

  const clear = useCallback(() => {
    latestRequest.current += 1;
    setPendingId(null);
  }, []);

  return { pendingId, run, clear };
}
