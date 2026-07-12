"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";

import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  confirmLabel = "Confirm",
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
    } catch {
      // Caller is responsible for their own error handling (toasts, rollback, etc.).
      // This catch prevents the unhandled promise rejection in React's event system.
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      className={styles.modal}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      role="alertdialog"
    >
      <div className={styles.message}>{children}</div>
      <div className={styles.actions}>
        <Button
          className={styles.button}
          type="button"
          variant="secondary"
          isDisabled={isPending}
          onPress={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          className={styles.button}
          type="button"
          variant="primary"
          isPending={isPending}
          onPress={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
