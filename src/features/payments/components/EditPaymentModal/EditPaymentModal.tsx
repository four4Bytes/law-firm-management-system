"use client";

import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import {
  deletePaymentAction,
  getPaymentRowByIdAction,
  updatePaymentAction,
} from "@/features/payments/actions";
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
  paymentId: string | null;
}

export function EditPaymentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  paymentId,
}: EditPaymentModalProps) {
  const [payment, setPayment] = useState<PaymentRow | null>(null);

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.Unpaid);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<z.input<typeof PaymentUpdatePayloadSchema>>({
    submit: updatePaymentAction,
    onOpenChange,
    onSuccess,
    successMessage: "Payment updated",
    failureMessage: "Failed to update payment",
  });

  useEffect(() => {
    if (!isOpen || !paymentId) return;

    const id = paymentId;
    let cancelled = false;

    async function load() {
      try {
        const data = await getPaymentRowByIdAction(id);
        if (cancelled) return;
        if (data) {
          setPayment(data);
          setAmount(String(data.amount));
          setPaymentDate(toCalendarDate(data.payment_date));
          setStatus(data.status as PaymentStatus);
          setPaymentMethod(data.payment_method ?? "");
          setReceiptNumber(data.receipt_number ?? "");
        } else {
          setPayment(null);
        }
      } catch {
        if (cancelled) return;
        setPayment(null);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, paymentId]);

  async function handleSave() {
    if (!amount.trim() || !paymentId) return;

    await submitForm({
      paymentId,
      amount: Number.parseFloat(amount),
      payment_date: paymentDate.toString(),
      status,
      payment_method: paymentMethod.trim() || undefined,
      receipt_number: receiptNumber.trim() || undefined,
    });
  }

  async function handleDelete() {
    if (!paymentId) return;
    setIsDeleting(true);

    const result = await deletePaymentAction(paymentId);

    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (result.success) {
      queue.add({ title: "Payment deleted" }, { timeout: 5000 });
      onOpenChange(false);
      onSuccess();
    } else {
      queue.add({ title: result.error ?? "Failed to delete payment" }, { timeout: 5000 });
    }
  }

  const isLoadingData = isOpen && payment == null;
  const hasChanges =
    amount.trim() !== String(payment?.amount ?? "") ||
    status !== (payment?.status ?? "Unpaid") ||
    paymentMethod.trim() !== (payment?.payment_method ?? "") ||
    receiptNumber.trim() !== (payment?.receipt_number ?? "");

  // Always treat date as changed if payment exists (DatePicker value comparison is complex)
  const isValid = amount.trim().length > 0;

  if (isLoadingData) {
    return (
      <Modal
        title="Edit Payment"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading payment" />
        </div>
      </Modal>
    );
  }

  if (!payment) {
    return (
      <Modal
        title="Edit Payment"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <span>Payment not found.</span>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        title="Edit Payment"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
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
            >
              {isPending ? "Saving..." : "Save"}
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
