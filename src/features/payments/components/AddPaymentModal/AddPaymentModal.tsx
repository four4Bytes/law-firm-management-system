"use client";

import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { createPaymentAction } from "@/features/payments/actions";
import { PaymentStatus } from "@/generated/prisma/browser";

import styles from "./AddPaymentModal.module.css";

const STATUS_OPTIONS = Object.values(PaymentStatus);

interface AddPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId?: string;
  consultationId?: string;
}

export function AddPaymentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  consultationId,
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [status, setStatus] = useState<string>(PaymentStatus.Unpaid);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [isPending, setIsPending] = useState(false);

  function handleCancel() {
    if (isPending) return;
    setAmount("");
    setPaymentDate(today(getLocalTimeZone()));
    setStatus(PaymentStatus.Unpaid);
    setPaymentMethod("");
    setReceiptNumber("");
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!amount.trim()) return;
    setIsPending(true);

    const date = paymentDate.toDate(getLocalTimeZone());

    const result = await createPaymentAction({
      amount: Number.parseFloat(amount),
      payment_date: date,
      status,
      payment_method: paymentMethod.trim() || undefined,
      receipt_number: receiptNumber.trim() || undefined,
      case_id: caseId ?? null,
      consultation_id: consultationId ?? null,
    });

    setIsPending(false);

    if (result.success) {
      queue.add({ title: "Payment added" }, { timeout: 5000 });
      setAmount("");
      setPaymentDate(today(getLocalTimeZone()));
      setStatus(PaymentStatus.Unpaid);
      setPaymentMethod("");
      setReceiptNumber("");
      onOpenChange(false);
      onSuccess();
    } else {
      queue.add({ title: result.error ?? "Failed to add payment" }, { timeout: 5000 });
    }
  }

  return (
    <Modal title="Add Payment" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <div className={styles.content}>
        <TextField
          label="Amount"
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
          isDisabled={isPending}
        />
        <DateField
          label="Payment Date"
          value={paymentDate}
          onChange={(v) => v && setPaymentDate(v)}
          isDisabled={isPending}
        />
        <Select label="Status" value={status} onChange={(k) => setStatus(String(k))}>
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
          isDisabled={isPending}
        />
        <TextField
          label="Receipt Number"
          value={receiptNumber}
          onChange={setReceiptNumber}
          placeholder="Optional receipt number"
          isDisabled={isPending}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button onPress={handleSubmit} isDisabled={!amount.trim() || isPending}>
            {isPending ? "Saving..." : "Save Payment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
