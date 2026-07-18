"use client";

import { CalendarDate } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
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
import {
  createFieldValidator,
  optionalString,
  selectEnumHandler,
  toDateValue,
} from "@/lib/form-utils";
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
    schema: PaymentUpdatePayloadSchema,
  });

  function handleDismiss() {
    if (isPending || isDeleting) return;
    onOpenChange(false);
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      paymentId: payment.id,
      amount: Number.parseFloat(amount),
      payment_date: toDateValue(paymentDate),
      status,
      payment_method: optionalString(paymentMethod),
      receipt_number: optionalString(receiptNumber),
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

  return (
    <>
      <Modal
        title="Edit Payment"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <Form onSubmit={handleSave}>
          <div className={styles.content}>
            <TextField
              label="Amount"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              validate={createFieldValidator(PaymentUpdatePayloadSchema.shape.amount)}
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
              onChange={selectEnumHandler(PaymentStatus, setStatus)}
              isDisabled={isPending || isDeleting}
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
              validate={createFieldValidator(PaymentUpdatePayloadSchema.shape.payment_method)}
              isDisabled={isPending || isDeleting}
            />
            <TextField
              label="Receipt Number"
              value={receiptNumber}
              onChange={setReceiptNumber}
              placeholder="Optional receipt number"
              validate={createFieldValidator(PaymentUpdatePayloadSchema.shape.receipt_number)}
              isDisabled={isPending || isDeleting}
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                type="submit"
                isDisabled={!hasChanges || isPending || isDeleting}
                isPending={isPending}
              >
                Save
              </Button>
              <Button
                onPress={() => setShowDeleteConfirm(true)}
                isDisabled={isPending || isDeleting}
              >
                {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
              </Button>
            </div>
          </div>
        </Form>
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
