"use client";

import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createPaymentAction } from "@/features/payments/actions";
import { PaymentCreatePayloadSchema } from "@/features/payments/schemas";
import { PaymentStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  selectEnumHandler,
  toDateValue,
} from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

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
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.Unpaid);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof PaymentCreatePayloadSchema>
  >({
    submit: createPaymentAction,
    onOpenChange,
    onSuccess,
    successMessage: "Payment added",
    failureMessage: "Failed to add payment",
    schema: PaymentCreatePayloadSchema,
    reset: () => {
      setAmount("");
      setPaymentDate(today(getLocalTimeZone()));
      setStatus(PaymentStatus.Unpaid);
      setPaymentMethod("");
      setReceiptNumber("");
    },
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      amount: Number.parseFloat(amount),
      payment_date: toDateValue(paymentDate),
      status,
      payment_method: optionalString(paymentMethod),
      receipt_number: optionalString(receiptNumber),
      case_id: caseId ?? null,
      consultation_id: consultationId ?? null,
    });
  }

  return (
    <Modal title="Add Payment" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSubmit}>
        <div className={styles.content}>
          <TextField
            label="Amount"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
            validate={createFieldValidator(PaymentCreatePayloadSchema.shape.amount)}
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
            validate={createFieldValidator(PaymentCreatePayloadSchema.shape.payment_method)}
            isDisabled={isPending}
          />
          <TextField
            label="Receipt Number"
            value={receiptNumber}
            onChange={setReceiptNumber}
            placeholder="Optional receipt number"
            validate={createFieldValidator(PaymentCreatePayloadSchema.shape.receipt_number)}
            isDisabled={isPending}
          />
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save Payment
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
