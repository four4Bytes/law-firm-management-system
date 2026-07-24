"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Form } from "react-aria-components";
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
import { CreateCaseFromConsultationModal } from "@/features/cases/components/CreateCaseFromConsultationModal/CreateCaseFromConsultationModal";
import type { ClientEditData } from "@/features/clients/queries";
import {
  deleteConsultationAction,
  updateConsultationWithClientAction,
} from "@/features/consultations/actions";
import type { ConsultationEditData } from "@/features/consultations/queries";
import {
  ConsultationWithClientUpdatePayload,
  ConsultationWithClientUpdatePayloadSchema,
} from "@/features/consultations/schemas";
import { getActiveUsersAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { ConsultationStatus } from "@/generated/prisma/browser";
import type { ActionStatusResponse } from "@/lib/action-response";
import { combineDateTime, toCalendarDate, toTimeValue } from "@/lib/date";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
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
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<ActiveUserSummary[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      try {
        setUsers(await getActiveUsersAction());
      } catch {
        queue.add({ title: "Failed to load active users. Please try again." }, { timeout: 5000 });
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
    failureMessage: "Failed to update consultation. Please try again.",
    schema: ConsultationWithClientUpdatePayloadSchema,
  });

  function handleDismiss() {
    if (isPending || isDeleting || isSaving) return;
    onOpenChange(false);
  }

  function buildConsultationPayload() {
    return {
      consultation_id: consultation.id,
      client_id: clientId,
      client: {
        name: requiredString(clientName),
        email: optionalString(clientEmail),
        phone_number: optionalString(clientPhone),
        address: optionalString(clientAddress),
      },
      consultation: {
        concern: requiredString(fields.concern),
        booking_datetime: combineDateTime(fields.date, fields.time),
        status: fields.status,
      },
    } satisfies ConsultationWithClientUpdatePayload;
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending || isDeleting || isSaving) return;

    if (fields.status !== ConsultationStatus.Accepted) {
      await submitForm(buildConsultationPayload());
      return;
    }

    setIsSaving(true);

    let result: ActionStatusResponse;
    try {
      result = await updateConsultationWithClientAction(buildConsultationPayload());
    } catch {
      queue.add({ title: "Failed to update consultation. Please try again." }, { timeout: 5000 });
      setIsSaving(false);
      return;
    }

    if (!result.success) {
      queue.add(
        { title: result.error ?? "Failed to update consultation. Please try again." },
        { timeout: 5000 },
      );
      setIsSaving(false);
      return;
    }

    queue.add({ title: "Consultation updated" }, { timeout: 5000 });
    setIsSaving(false);
    setShowCaseModal(true);
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

  return (
    <>
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
                isDisabled={isPending || isDeleting || isSaving}
              />
              <TextField
                label="Email"
                value={clientEmail}
                onChange={setClientEmail}
                placeholder="Optional"
                validate={createFieldValidator(
                  ConsultationWithClientUpdatePayloadSchema.shape.client.shape.email,
                )}
                isDisabled={isPending || isDeleting || isSaving}
              />
              <TextField
                label="Phone"
                value={clientPhone}
                onChange={setClientPhone}
                placeholder="Optional"
                validate={createFieldValidator(
                  ConsultationWithClientUpdatePayloadSchema.shape.client.shape.phone_number,
                )}
                isDisabled={isPending || isDeleting || isSaving}
              />
              <TextField
                label="Address"
                value={clientAddress}
                onChange={setClientAddress}
                placeholder="Optional"
                isTextArea
                rows={3}
                validate={createFieldValidator(
                  ConsultationWithClientUpdatePayloadSchema.shape.client.shape.address,
                )}
                isDisabled={isPending || isDeleting || isSaving}
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
                isDisabled={isPending || isDeleting || isSaving}
              />
              <DatePicker
                label="Booking Date"
                value={fields.date}
                onChange={(v) => v && setFields((p) => ({ ...p, date: v }))}
                isDisabled={isPending || isDeleting || isSaving}
              />
              <TimeField
                label="Booking Time"
                value={fields.time}
                onChange={(v) =>
                  v && setFields((p) => ({ ...p, time: new Time(v.hour, v.minute) }))
                }
                isDisabled={isPending || isDeleting || isSaving}
              />
              <Select
                label="Status"
                value={fields.status}
                onChange={selectEnumHandler(ConsultationStatus, (value) =>
                  setFields((p) => ({ ...p, status: value })),
                )}
                isDisabled={isPending || isDeleting || isSaving}
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
              type="submit"
              isDisabled={isPending || isDeleting || isSaving}
              isPending={isPending || isSaving}
            >
              Save
            </Button>
            <Button
              onPress={() => setShowDeleteConfirm(true)}
              isDisabled={isPending || isDeleting || isSaving}
            >
              {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
            </Button>
          </div>
        </Form>
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

      <CreateCaseFromConsultationModal
        isOpen={showCaseModal}
        onOpenChange={(open) => {
          setShowCaseModal(open);
          if (!open) {
            onSuccess();
            onOpenChange(false);
          }
        }}
        onSuccess={(caseId) => {
          setShowCaseModal(false);
          onOpenChange(false);
          router.push(`/case/${caseId}`);
        }}
        consultationId={consultation.id}
        clientId={clientId}
        defaultTitle={fields.concern}
        users={users}
      />
    </>
  );
}
