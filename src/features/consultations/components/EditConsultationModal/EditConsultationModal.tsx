"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { queue } from "@/components/ui/Toast/Toast";
import type { ClientEditData } from "@/features/clients/queries";
import {
  deleteConsultationAction,
  updateConsultationWithClientAction,
} from "@/features/consultations/actions";
import type { ConsultationEditData } from "@/features/consultations/queries";
import { ConsultationWithClientUpdatePayloadSchema } from "@/features/consultations/schemas";
import { ConsultationStatus } from "@/generated/prisma/browser";
import { combineDateTime, toCalendarDate, toTimeValue } from "@/lib/date";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditConsultationModal.module.css";

const STATUS_OPTIONS = Object.values(ConsultationStatus);

interface EditConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  onDeleted: () => void;
  consultation: ConsultationEditData;
  clientData: ClientEditData;
}

interface ConsultationFields {
  concern: string;
  date: CalendarDate;
  time: Time;
  status: ConsultationStatus;
}

export function EditConsultationModal({
  isOpen,
  onOpenChange,
  onSuccess,
  onDeleted,
  consultation,
  clientData,
}: EditConsultationModalProps) {
  const [clientId] = useState(consultation.client_id);
  const [clientName, setClientName] = useState(clientData.name);
  const [clientEmail, setClientEmail] = useState(clientData.email ?? "");
  const [clientPhone, setClientPhone] = useState(clientData.phone_number ?? "");
  const [clientAddress, setClientAddress] = useState(clientData.address ?? "");

  const [fields, setFields] = useState<ConsultationFields>({
    concern: consultation.concern,
    date: toCalendarDate(consultation.booking_datetime),
    time: toTimeValue(consultation.booking_datetime),
    status: consultation.status as ConsultationStatus,
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<
    z.input<typeof ConsultationWithClientUpdatePayloadSchema>
  >({
    submit: updateConsultationWithClientAction,
    onOpenChange,
    onSuccess,
    successMessage: "Consultation updated",
    failureMessage: "Failed to update consultation. Please try again.",
  });

  function handleDismiss() {
    if (isPending || isDeleting) return;
    onOpenChange(false);
  }

  async function handleSave() {
    if (!clientId || !clientName.trim() || !fields.concern.trim() || isPending) return;

    await submitForm({
      consultation_id: consultation.id,
      client_id: clientId,
      client: {
        name: clientName.trim(),
        email: clientEmail.trim() || undefined,
        phone_number: clientPhone.trim() || undefined,
        address: clientAddress.trim() || undefined,
      },
      consultation: {
        concern: fields.concern.trim(),
        booking_datetime: combineDateTime(fields.date, fields.time),
        status: fields.status,
      },
    });
  }

  async function handleDelete() {
    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      const result = await deleteConsultationAction({ consultationId: consultation.id });

      if (result.success) {
        queue.add({ title: "Consultation deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onDeleted();
      } else {
        queue.add({ title: result.error ?? "Failed to delete consultation" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete consultation. Please try again." }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
    }
  }

  const isValid =
    clientId.length > 0 && clientName.trim().length > 0 && fields.concern.trim().length > 0;

  return (
    <>
      <Modal
        title="Edit Consultation"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Client Name"
              value={clientName}
              onChange={setClientName}
              isDisabled={isPending || isDeleting}
            />
            <TextField
              label="Email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="Optional"
              isDisabled={isPending || isDeleting}
            />
            <TextField
              label="Phone"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="Optional"
              isDisabled={isPending || isDeleting}
            />
            <TextField
              label="Address"
              value={clientAddress}
              onChange={setClientAddress}
              placeholder="Optional"
              isTextArea
              rows={3}
              isDisabled={isPending || isDeleting}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.column}>
            <TextField
              label="Concern"
              value={fields.concern}
              onChange={(v) => setFields((p) => ({ ...p, concern: v }))}
              isTextArea
              rows={4}
              isDisabled={isPending || isDeleting}
            />
            <DatePicker
              label="Booking Date"
              value={fields.date}
              onChange={(v) => v && setFields((p) => ({ ...p, date: v }))}
              isDisabled={isPending || isDeleting}
            />
            <TimeField
              label="Booking Time"
              value={fields.time}
              onChange={(v) => v && setFields((p) => ({ ...p, time: new Time(v.hour, v.minute) }))}
              isDisabled={isPending || isDeleting}
            />
            <Select
              label="Status"
              value={fields.status}
              onChange={(k) =>
                setFields((p) => ({ ...p, status: String(k) as ConsultationStatus }))
              }
              isDisabled={isPending || isDeleting}
            >
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} id={s}>
                  {s}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onPress={handleSave}
            isDisabled={!isValid || isPending || isDeleting}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isPending || isDeleting}>
            {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Consultation"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        This permanently deletes the consultation and ALL its notes, documents, and payments. Linked
        cases are kept (unlinked). This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
