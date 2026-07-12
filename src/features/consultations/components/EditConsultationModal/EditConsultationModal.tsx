"use client";

import { CalendarDate, getLocalTimeZone, Time, today } from "@internationalized/date";
import { useEffect, useState } from "react";
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
import { getClientForEditAction } from "@/features/clients/actions";
import {
  deleteConsultationAction,
  getConsultationForEditAction,
  updateConsultationAction,
  updateConsultationWithClientAction,
} from "@/features/consultations/actions";
import type { ConsultationEditData } from "@/features/consultations/queries";
import { ConsultationUpdatePayloadSchema } from "@/features/consultations/schemas";
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
  consultationId: string | null;
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
  consultationId,
}: EditConsultationModalProps) {
  const [consultation, setConsultation] = useState<ConsultationEditData | null>(null);

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [fields, setFields] = useState<ConsultationFields>({
    concern: "",
    date: today(getLocalTimeZone()),
    time: new Time(9, 0),
    status: ConsultationStatus.Scheduled,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { handleCancel } = useModalForm<z.input<typeof ConsultationUpdatePayloadSchema>>({
    submit: updateConsultationAction,
    onOpenChange,
    onSuccess,
    successMessage: "Consultation updated",
    failureMessage: "Failed to update consultation",
  });

  function handleDismiss() {
    if (isSaving || isDeleting) return;
    handleCancel();
  }

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function load() {
      try {
        const data = await getConsultationForEditAction(consultationId ?? "");
        if (cancelled) return;

        if (data) {
          setConsultation(data);
          setClientId(data.client_id);
          setFields({
            concern: data.concern,
            date: toCalendarDate(data.booking_datetime),
            time: toTimeValue(data.booking_datetime),
            status: data.status as ConsultationStatus,
          });

          const clientRes = await getClientForEditAction(data.client_id);
          if (cancelled) return;

          if (clientRes.success && clientRes.data) {
            setClientName(clientRes.data.name);
            setClientEmail(clientRes.data.email ?? "");
            setClientPhone(clientRes.data.phone_number ?? "");
            setClientAddress(clientRes.data.address ?? "");
          }
        } else {
          setConsultation(null);
        }
      } catch {
        if (cancelled) return;
        setConsultation(null);
        queue.add({ title: "Failed to load consultation" }, { timeout: 5000 });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, consultationId]);

  async function handleSave() {
    if (!clientId || !clientName.trim() || !fields.concern.trim() || !consultationId || isSaving)
      return;

    setIsSaving(true);

    const result = await updateConsultationWithClientAction({
      consultation_id: consultationId,
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

    setIsSaving(false);

    if (!result.success) {
      queue.add({ title: result.error ?? "Failed to update consultation" }, { timeout: 5000 });
      return;
    }

    queue.add({ title: "Consultation updated" }, { timeout: 5000 });
    onOpenChange(false);
    onSuccess();
  }

  async function handleDelete() {
    if (!consultationId) return;
    setIsDeleting(true);

    const result = await deleteConsultationAction({ id: consultationId });

    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (result.success) {
      queue.add({ title: "Consultation deleted" }, { timeout: 5000 });
      onOpenChange(false);
      onDeleted();
    } else {
      queue.add({ title: result.error ?? "Failed to delete consultation" }, { timeout: 5000 });
    }
  }

  const isLoadingData = isOpen && consultation == null;
  const isValid =
    clientId.length > 0 && clientName.trim().length > 0 && fields.concern.trim().length > 0;

  if (isLoadingData) {
    return (
      <Modal
        title="Edit Consultation"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading consultation" />
        </div>
      </Modal>
    );
  }

  if (!consultation) {
    return (
      <Modal
        title="Edit Consultation"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <span>Consultation not found.</span>
        </div>
      </Modal>
    );
  }

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
              isDisabled={isSaving || isDeleting}
            />
            <TextField
              label="Email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="Optional"
              isDisabled={isSaving || isDeleting}
            />
            <TextField
              label="Phone"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="Optional"
              isDisabled={isSaving || isDeleting}
            />
            <TextField
              label="Address"
              value={clientAddress}
              onChange={setClientAddress}
              placeholder="Optional"
              isTextArea
              rows={3}
              isDisabled={isSaving || isDeleting}
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
              isDisabled={isSaving || isDeleting}
            />
            <DatePicker
              label="Booking Date"
              value={fields.date}
              onChange={(v) => v && setFields((p) => ({ ...p, date: v }))}
              isDisabled={isSaving || isDeleting}
            />
            <TimeField
              label="Booking Time"
              value={fields.time}
              onChange={(v) => v && setFields((p) => ({ ...p, time: new Time(v.hour, v.minute) }))}
              isDisabled={isSaving || isDeleting}
            />
            <Select
              label="Status"
              value={fields.status}
              onChange={(k) =>
                setFields((p) => ({ ...p, status: String(k) as ConsultationStatus }))
              }
              isDisabled={isSaving || isDeleting}
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
            isDisabled={!isValid || isSaving || isDeleting}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isSaving || isDeleting}>
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
