"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useEffect, useMemo, useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
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
import { combineDateTime, toCalendarDate, toTimeValue } from "@/lib/date";
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
  });

  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(
    () => new Set(consultation.assignee_ids),
  );

  const [users, setUsers] = useState<ActiveUserSummary[]>([]);

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

    await submitForm(buildConsultationPayload());
  }

  return (
    <Modal
      title="Edit Consultation"
      isOpen={isOpen}
      onOpenChange={handleDismiss}
      className={styles.modal}
    >
      <Form onSubmit={handleSave}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Client Name"
              value={clientName}
              onChange={setClientName}
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.client.shape.name,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="Optional"
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.client.shape.email,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Phone"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="Required"
              validate={createFieldValidator(
                ConsultationWithClientUpdatePayloadSchema.shape.client.shape.phone_number,
              )}
              isDisabled={isPending}
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
              isDisabled={isPending}
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
              isDisabled={isPending}
            />
            <DatePicker
              label="Booking Date"
              value={fields.date}
              onChange={(v) => v && setFields((p) => ({ ...p, date: v }))}
              isDisabled={isPending}
            />
            <TimeField
              label="Booking Time"
              value={fields.time}
              onChange={(v) => v && setFields((p) => ({ ...p, time: new Time(v.hour, v.minute) }))}
              isDisabled={isPending}
            />
            <UserSelect
              users={assigneeOptions}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
              isDisabled={isPending}
            />
            {assigneeIds.size > 0 && (
              <UserChips users={assigneeOptions.filter((user) => assigneeIds.has(user.id))} />
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleDismiss} isDisabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isDisabled={isPending} isPending={isPending}>
            Save
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
