"use client";

import { useRef, useState } from "react";

import type { ActionStatusResponse } from "@/lib/action-response";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";

/** Options for {@link useStatusWorkflow}. */
interface UseStatusWorkflowOptions {
  /** Verb phrase for toast fallbacks (e.g. `"change case status"`). */
  operation: string;
}

/** Return value of {@link useStatusWorkflow}. */
interface UseStatusWorkflowReturn {
  /** True while a status-change submission is in flight. */
  isWorkflowPending: boolean;
  /**
   * Runs a workflow task under the pending flag, surfacing throws as toasts.
   *
   * @param task - Async work to run.
   * @param failureTitle - Toast title when `task` throws.
   */
  runWorkflowTask: (task: () => Promise<void>, failureTitle: string) => Promise<void>;
  /**
   * Submits a status change, toasting success or the structured failure.
   *
   * @param change - The status-change Server Action invocation.
   * @param successDescription - Toast body on success.
   * @returns True when the change succeeded.
   */
  applyChange: (
    change: () => Promise<ActionStatusResponse>,
    successDescription: string,
  ) => Promise<boolean>;
}

/**
 * Shared pending/toast lifecycle for record status workflows (consultation
 * and case detail pages). Callers own routing and modal state; this hook owns
 * the in-flight flag and every toast the flow can produce.
 *
 * @param options - Toast operation label.
 * @returns Pending flag plus `runWorkflowTask` and `applyChange` helpers.
 */
export function useStatusWorkflow(options: UseStatusWorkflowOptions): UseStatusWorkflowReturn {
  const { operation } = options;
  const [isWorkflowPending, setIsWorkflowPending] = useState(false);
  const activeRef = useRef(false);

  async function runWorkflowTask(task: () => Promise<void>, failureTitle: string): Promise<void> {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsWorkflowPending(true);
    try {
      await task();
    } catch {
      toastError(
        failureTitle,
        "Please try again. If this keeps happening, refresh the page and try again.",
      );
    } finally {
      activeRef.current = false;
      setIsWorkflowPending(false);
    }
  }

  async function applyChange(
    change: () => Promise<ActionStatusResponse>,
    successDescription: string,
  ): Promise<boolean> {
    let succeeded = false;
    await runWorkflowTask(async () => {
      const result = await change();
      if (result.success) {
        toastSuccess("Status updated", successDescription);
        succeeded = true;
      } else {
        toastActionError(result, operation);
      }
    }, "Failed to update status");
    return succeeded;
  }

  return { isWorkflowPending, runWorkflowTask, applyChange };
}
