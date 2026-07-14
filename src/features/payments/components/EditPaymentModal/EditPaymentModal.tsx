"use client";

import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { deletePaymentAction, updatePaymentAction } from "@/features/payments/actions";
import type { PaymentRow } from "@/features/payments/queries";
import { PaymentUpdatePayloadSchema } from "@/features/payments/schemas";
import { PaymentStatus } from "@/generated/prisma/browser";
import { toCalendarDate } from "@/lib/date";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditPaymentModal.module.css";

const STATUS_OPTIONS = Object.values(PaymentStatus);

interface EditPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  payment: PaymentRow;
}

export function EditPaymentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  payment,
}: EditPaymentModalProps) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [paymentDate, setPaymentDate] = useState<CalendarDate>(
    toCalendarDate(payment.payment_date),
  );
  const [status, setStatus] = useState<PaymentStatus>(payment.status as PaymentStatus);
  const [paymentMethod, setPaymentMethod] = useState(payment.payment_method ?? "");
  const [receiptNumber, setReceiptNumber] = useState(payment.receipt_number ?? "");

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<z.input<typeof PaymentUpdatePayloadSchema>>({
    submit: updatePaymentAction,
    onOpenChange,
    onSuccess,
    successMessage: "Payment updated",
    failureMessage: "Failed to update payment",
  });

  function handleDismiss() {
    if (isPending || isDeleting) return;
    onOpenChange(false);
  }

  async function handleSave() {
    if (!amount.trim()) return;

    await submitForm({
      paymentId: payment.id,
      amount: Number.parseFloat(amount),
      payment_date: paymentDate.toDate(getLocalTimeZone()),
      status,
      payment_method: paymentMethod.trim() || undefined,
      receipt_number: receiptNumber.trim() || undefined,
    });
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deletePaymentAction({ paymentId: payment.id });

      setShowDeleteConfirm(false);

      if (result.success) {
        queue.add({ title: "Payment deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onSuccess();
      } else {
        queue.add({ title: result.error ?? "Failed to delete payment" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete payment. Please try again." }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
    }
  }

  const hasChanges =
    amount.trim() !== String(payment.amount) ||
    paymentDate.compare(toCalendarDate(payment.payment_date)) !== 0 ||
    status !== (payment.status as PaymentStatus) ||
    paymentMethod.trim() !== (payment.payment_method ?? "") ||
    receiptNumber.trim() !== (payment.receipt_number ?? "");

  const isValid = amount.trim().length > 0;

  return (
    <>
      <Modal
        title="Edit Payment"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.content}>
          <TextField
            label="Amount"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
            isDisabled={isPending || isDeleting}
          />
          <DateField
            label="Payment Date"
            value={paymentDate}
            onChange={(v) => v && setPaymentDate(v)}
            isDisabled={isPending || isDeleting}
          />
          <Select
            label="Status"
            value={status}
            onChange={(k) => setStatus(String(k) as PaymentStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} id={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
          <TextField
            label="Payment Method"
            value={paymentMethod}
            onChange={setPaymentMethod}
            placeholder="e.g. Cash, Credit Card, Bank Transfer"
            isDisabled={isPending || isDeleting}
          />
          <TextField
            label="Receipt Number"
            value={receiptNumber}
            onChange={setReceiptNumber}
            placeholder="Optional receipt number"
            isDisabled={isPending || isDeleting}
          />
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onPress={handleSave}
              isDisabled={!isValid || (!hasChanges && !isPending) || isPending || isDeleting}
              isPending={isPending}
            >
              Save
            </Button>
            <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isPending || isDeleting}>
              {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Payment"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this payment? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
