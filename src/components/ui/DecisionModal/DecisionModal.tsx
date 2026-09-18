"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { createFieldValidator, optionalString } from "@/lib/form-utils";
import { toastError } from "@/lib/toast-utils";

import styles from "./DecisionModal.module.css";

interface DecisionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  confirmLabel: string;
  reasonSchema: ZodType;
  onConfirm: (reason?: string) => Promise<boolean | void>;
}

export function DecisionModal({
  isOpen,
  onOpenChange,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
  reasonSchema,
  onConfirm,
}: DecisionModalProps) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  function handleDismiss() {
    if (isPending) return;
    setReason("");
    onOpenChange(false);
  }

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);
    try {
      const succeeded = await onConfirm(optionalString(reason));
      if (succeeded !== false) setReason("");
    } catch {
      toastError("Failed to save decision", "The decision could not be saved. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal title={title} isOpen={isOpen} onOpenChange={handleDismiss} className={styles.modal}>
      <Form validationBehavior="native" onSubmit={handleSubmit}>
        <p className={styles.description}>{description}</p>
        <div className={styles.column}>
          <TextField
            label={reasonLabel}
            value={reason}
            onChange={setReason}
            placeholder={reasonPlaceholder}
            validate={createFieldValidator(reasonSchema)}
            isDisabled={isPending}
            isTextArea
            rows={3}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleDismiss} isDisabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={isPending} isPending={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
