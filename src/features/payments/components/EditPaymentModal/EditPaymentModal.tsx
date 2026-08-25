"use client";

import { CalendarDate } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { updatePaymentAction } from "@/features/payments/actions";
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
  const [status, setStatus] = useState<PaymentStatus>(payment.status);
  const [paymentMethod, setPaymentMethod] = useState(payment.payment_method ?? "");
  const [receiptNumber, setReceiptNumber] = useState(payment.receipt_number ?? "");

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof PaymentUpdatePayloadSchema>
  >({
    submit: updatePaymentAction,
    onOpenChange,
    onSuccess,
    successMessage: "Payment updated",
    successDescription: "The payment has been updated.",
    failureMessage: "Failed to update payment",
    schema: PaymentUpdatePayloadSchema,
  });

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

  return (
    <Modal
      title="Edit Payment"
      isOpen={isOpen}
      onOpenChange={handleCancel}
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
            isDisabled={isPending}
          />
          <DateField
            label="Payment Date"
            value={paymentDate}
            onChange={(v) => v && setPaymentDate(v)}
            isDisabled={isPending}
          />
          <Select
            label="Status"
            value={status}
            onChange={selectEnumHandler(PaymentStatus, setStatus)}
            isDisabled={isPending}
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
            isDisabled={isPending}
          />
          <TextField
            label="Receipt Number"
            value={receiptNumber}
            onChange={setReceiptNumber}
            placeholder="Optional receipt number"
            validate={createFieldValidator(PaymentUpdatePayloadSchema.shape.receipt_number)}
            isDisabled={isPending}
          />
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
