"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useEffect, useMemo, useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Link } from "@/components/ui/Link/Link";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import type { ClientEditData } from "@/features/clients/queries";
import { updateConsultationWithClientAction } from "@/features/consultations/actions";
import type { ConsultationEditData } from "@/features/consultations/queries";
import { ConsultationWithClientUpdatePayloadSchema } from "@/features/consultations/schemas";
import { getActiveUsersAction } from "@/features/users/actions";
import { UserChips } from "@/features/users/components/UserChips/UserChips";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import type { ActiveUserSummary } from "@/features/users/queries";
import { ConsultationStatus } from "@/generated/prisma/browser";
import {
  combineDateTime,
  formatDateTime,
  isBeforeToday,
  toCalendarDate,
  toMinuteEpoch,
  toTimeValue,
} from "@/lib/date";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { toastError } from "@/lib/toast-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditConsultationModal.module.css";

interface EditConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  consultation: ConsultationEditData;
  clientData: ClientEditData;
  isLocked: boolean;
  linkedCaseId: string | null;
}

interface ConsultationFields {
  concern: string;
  date: CalendarDate;
  time: Time;
}

export function EditConsultationModal({
  isOpen,
  onOpenChange,
  onSuccess,
  consultation,
  clientData,
  isLocked,
  linkedCaseId,
}: EditConsultationModalProps) {
  const isScheduled = consultation.status === ConsultationStatus.Scheduled;
  const bookingLockedDescription = isScheduled
    ? undefined
    : consultation.status === ConsultationStatus.Cancelled
      ? "Rebook the consultation to set a new booking."
      : "The booking can only change while a consultation is scheduled.";
  const [clientId] = useState(consultation.client_id);
  const [clientName, setClientName] = useState(clientData.name);
  const [clientEmail, setClientEmail] = useState(clientData.email ?? "");
  const [clientPhone, setClientPhone] = useState(clientData.phone_number ?? "");
  const [clientAddress, setClientAddress] = useState(clientData.address ?? "");

  const [fields, setFields] = useState<ConsultationFields>({
    concern: consultation.concern,
    date: toCalendarDate(consultation.booking_datetime),
    time: toTimeValue(consultation.booking_datetime),
  });

  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(
    () => new Set(consultation.assignee_ids),
  );

  const [users, setUsers] = useState<ActiveUserSummary[]>([]);
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  const newBooking = combineDateTime(fields.date, fields.time);
  const bookingChanged = toMinuteEpoch(newBooking) !== toMinuteEpoch(consultation.booking_datetime);
  const needsRescheduleConfirm = !isLocked && isScheduled && bookingChanged;

  function validateBookingDate(): string | null {
    if (!bookingChanged) return null;
    if (isBeforeToday(newBooking)) return "Booking date cannot be in the past";
    return null;
  }
  const assigneeOptions = useMemo(() => {
    const directoryIds = new Set(users.map((user) => user.id));
    const missing = consultation.assignees.filter(
      (assignee) => assigneeIds.has(assignee.id) && !directoryIds.has(assignee.id),
    );
    return [...users, ...missing];
  }, [users, assigneeIds, consultation.assignees]);

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      try {
        setUsers(await getActiveUsersAction());
      } catch {
        toastError(
          "Failed to load active users",
          "The team member list could not be loaded. Please try again.",
        );
      }
    })();
  }, [isOpen]);

  const { isPending, submitForm } = useModalForm<
    z.input<typeof ConsultationWithClientUpdatePayloadSchema>
  >({
    submit: updateConsultationWithClientAction,
    onOpenChange,
    onSuccess,
    successMessage: "Consultation updated",
    successDescription: "The consultation has been updated.",
    failureMessage: "Failed to update consultation. Please try again.",
    schema: ConsultationWithClientUpdatePayloadSchema,
  });

  function handleDismiss() {
    if (isPending) return;
    onOpenChange(false);
  }

  function buildConsultationPayload() {
    return {
      consultation_id: consultation.id,
      client_id: clientId,
      client: {
        name: requiredString(clientName),
        email: optionalString(clientEmail),
        phone_number: requiredString(clientPhone),
        address: optionalString(clientAddress),
      },
      consultation: {
        concern: requiredString(fields.concern),
        booking_datetime: combineDateTime(fields.date, fields.time),
        assignee_ids: Array.from(assigneeIds),
      },
    };
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    if (needsRescheduleConfirm) {
      setShowRescheduleConfirm(true);
      return;
    }
    await submitForm(buildConsultationPayload());
  }

  async function handleRescheduleConfirm() {
    if (isPending) return;
    setShowRescheduleConfirm(false);
    await submitForm(buildConsultationPayload());
  }

  const fieldsDisabled = isPending || isLocked;
  const bookingDisabled = isPending || isLocked || !isScheduled;

  return (
    <Modal
      title="Edit Consultation"
      isOpen={isOpen}
      onOpenChange={handleDismiss}
      className={styles.modal}
    >
      <ConfirmDialog
        isOpen={showRescheduleConfirm}
        onOpenChange={setShowRescheduleConfirm}
        title="Reschedule consultation"
        confirmLabel="Reschedule"
        onConfirm={handleRescheduleConfirm}
      >
        {`Move the booking from ${formatDateTime(consultation.booking_datetime)} to ${formatDateTime(newBooking)}? Assigned staff will be notified and reminders will restart.`}
      </ConfirmDialog>
      <Form validationBehavior="native" onSubmit={handleSave}>
        {isLocked && (
          <p className={styles.lockedNotice}>
            This consultation has been accepted and linked to a case. Update the{" "}
            {linkedCaseId ? <Link href={`/case/${linkedCaseId}`}>linked case</Link> : "linked case"}{" "}
            instead — these details are read-only.
          </p>
        )}
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Client Name"
              value={clientName}
              onChange={setClientName}
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.client.shape.name,
              )}
              isDisabled={fieldsDisabled}
            />
            <TextField
              label="Email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="Optional"
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.client.shape.email,
              )}
              isDisabled={fieldsDisabled}
            />
            <TextField
              label="Phone"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="Required"
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.client.shape.phone_number,
              )}
              isDisabled={fieldsDisabled}
            />
            <TextField
              label="Address"
              value={clientAddress}
              onChange={setClientAddress}
              placeholder="Optional"
              isTextArea
              rows={6}
              className={styles.addressField}
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.client.shape.address,
              )}
              isDisabled={fieldsDisabled}
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
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.consultation.shape.concern,
              )}
              isDisabled={fieldsDisabled}
            />
            <DatePicker
              label="Booking Date"
              value={fields.date}
              onChange={(v) => v && setFields((p) => ({ ...p, date: v }))}
              isDisabled={bookingDisabled}
              description={bookingLockedDescription}
              validate={validateBookingDate}
            />
            <TimeField
              label="Booking Time"
              value={fields.time}
              onChange={(v) => v && setFields((p) => ({ ...p, time: new Time(v.hour, v.minute) }))}
              isDisabled={bookingDisabled}
              description={bookingLockedDescription}
            />
            <UserSelect
              users={assigneeOptions}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
              isDisabled={fieldsDisabled}
            />
            {assigneeIds.size > 0 && (
              <UserChips users={assigneeOptions.filter((user) => assigneeIds.has(user.id))} />
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleDismiss} isDisabled={isPending}>
            {isLocked ? "Close" : "Cancel"}
          </Button>
          {!isLocked && (
            <Button variant="primary" type="submit" isDisabled={isPending} isPending={isPending}>
              Save
            </Button>
          )}
        </div>
      </Form>
    </Modal>
  );
}
