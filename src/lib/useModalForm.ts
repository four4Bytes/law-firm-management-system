"use client";

import { useState } from "react";
import type { ZodType } from "zod";

import type { ActionStatusResponse } from "@/lib/action-response";
import { toastError, toastSuccess } from "@/lib/toast-utils";

/** Configuration for {@link useModalForm}. */
interface UseModalFormOptions<TArgs> {
  /** Server Action invoked with the payload; omit to render a read-only form. */
  submit?: (args: TArgs) => Promise<ActionStatusResponse>;
  /** Called to close the modal (on success or cancel). */
  onOpenChange: (open: boolean) => void;
  /** Toast shown when the action succeeds. */
  successMessage: string;
  /** Full-sentence confirmation shown beneath `successMessage` on success. */
  successDescription?: string;
  /** Toast shown when the action fails or is rejected by `schema`. */
  failureMessage: string;
  /** Optional callback run after a successful submission. */
  onSuccess?: () => void;
  /** Optional reset invoked on cancel and after a successful submission. */
  reset?: () => void;
  /**
   * Optional Zod schema used to short-circuit submission with a toast on invalid
   * input. Should accept a value of `TArgs` — Zod v4's covariant `Input` parameter
   * makes this a documentation-era convention rather than a compile-time constraint.
   */
  schema?: ZodType;
}

/** Return value of {@link useModalForm}. */
interface UseModalFormReturn<TArgs> {
  /** True while a submission is in flight. */
  isPending: boolean;
  /** Validates (when `schema` is set) then invokes `submit`, handling toasts and lifecycle. */
  submitForm: (args: TArgs) => Promise<void>;
  /** Closes the modal, resetting state unless a submission is pending. */
  handleCancel: () => void;
}

/**
 * Shared form-submission lifecycle for modals.
 *
 * Callers must provide the `TArgs` generic explicitly (e.g.
 * `useModalForm<z.input<typeof SomeSchema>>`) because `submit` cannot infer it
 * from the payload — omitting it widens `submitForm` arguments to `unknown`.
 *
 * @typeParam TArgs - The payload type accepted by the Server Action.
 * @returns An object with `isPending`, `submitForm`, and `handleCancel`.
 */
export function useModalForm<TArgs>({
  submit,
  onOpenChange,
  successMessage,
  successDescription,
  failureMessage,
  onSuccess,
  reset,
  schema,
}: UseModalFormOptions<TArgs>): UseModalFormReturn<TArgs> {
  const [isPending, setIsPending] = useState(false);

  /**
   * Validates (when `schema` is set) then invokes `submit`, handling toasts and lifecycle.
   *
   * @param args - The payload passed to the configured Server Action.
   * @returns A promise that resolves once the action completes (or immediately when
   * no `submit` is configured, or when schema validation fails).
   */
  async function submitForm(args: TArgs) {
    if (!submit) return;

    if (schema) {
      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        const issueMessage = parsed.error.issues[0]?.message;
        toastError(failureMessage, issueMessage ?? "Please review your input and try again.");
        return;
      }
    }

    setIsPending(true);

    try {
      const result = await submit(args);

      if (result.success) {
        toastSuccess(successMessage, successDescription ?? "Your changes have been saved.");
        reset?.();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toastError(
          result.error?.title ?? failureMessage,
          result.error?.description ?? "Something went wrong on our end. Please try again.",
        );
      }
    } catch (error) {
      console.error("useModalForm: submit failed", error);
      toastError(failureMessage, "Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  /**
   * Resets the form state and closes the modal.
   * Performs no action while a submission is in flight.
   */
  function handleCancel() {
    if (isPending) return;
    reset?.();
    onOpenChange(false);
  }

  return { isPending, submitForm, handleCancel };
}
