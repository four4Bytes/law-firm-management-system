"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { deleteCaseAction, updateCaseWithClientAction } from "@/features/cases/actions";
import type { CaseEditData } from "@/features/cases/queries";
import { CaseWithClientUpdatePayloadSchema } from "@/features/cases/schemas";
import type { ClientEditData } from "@/features/clients/queries";
import { CaseStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditCaseModal.module.css";

const STATUS_OPTIONS = Object.values(CaseStatus);

interface EditCaseModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  onDeleted: () => void;
  caseData: CaseEditData;
  clientData: ClientEditData;
}

export function EditCaseModal({
  isOpen,
  onOpenChange,
  onSuccess,
  onDeleted,
  caseData,
  clientData,
}: EditCaseModalProps) {
  const [clientId] = useState(caseData.client_id);
  const [clientName, setClientName] = useState(clientData.name);
  const [clientEmail, setClientEmail] = useState(clientData.email ?? "");
  const [clientPhone, setClientPhone] = useState(clientData.phone_number ?? "");
  const [clientAddress, setClientAddress] = useState(clientData.address ?? "");

  const [caseTitle, setCaseTitle] = useState(caseData.case_title);
  const [caseType, setCaseType] = useState(caseData.case_type);
  const [status, setStatus] = useState<CaseStatus>(caseData.status as CaseStatus);
  const [partiesInvolved, setPartiesInvolved] = useState(caseData.parties_involved ?? "");

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<z.input<typeof CaseWithClientUpdatePayloadSchema>>(
    {
      submit: updateCaseWithClientAction,
      onOpenChange,
      onSuccess,
      successMessage: "Case updated",
      failureMessage: "Failed to update case. Please try again.",
      schema: CaseWithClientUpdatePayloadSchema,
    },
  );

  function handleDismiss() {
    if (isPending || isDeleting) return;
    onOpenChange(false);
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      case_id: caseData.id,
      client_id: clientId,
      client: {
        name: requiredString(clientName),
        email: optionalString(clientEmail),
        phone_number: optionalString(clientPhone),
        address: optionalString(clientAddress),
      },
      case: {
        case_title: requiredString(caseTitle),
        case_type: requiredString(caseType),
        status,
        parties_involved: optionalString(partiesInvolved),
      },
    });
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteCaseAction({ caseId: caseData.id });

      setShowDeleteConfirm(false);

      if (result.success) {
        queue.add({ title: "Case deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onDeleted();
      } else {
        queue.add({ title: result.error ?? "Failed to delete case" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete case. Please try again." }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Modal
        title="Edit Case"
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
                  CaseWithClientUpdatePayloadSchema.shape.client.shape.name,
                )}
                isDisabled={isPending || isDeleting}
              />
              <TextField
                label="Email"
                value={clientEmail}
                onChange={setClientEmail}
                placeholder="Optional"
                validate={createFieldValidator(
                  CaseWithClientUpdatePayloadSchema.shape.client.shape.email,
                )}
                isDisabled={isPending || isDeleting}
              />
              <TextField
                label="Phone"
                value={clientPhone}
                onChange={setClientPhone}
                placeholder="Optional"
                validate={createFieldValidator(
                  CaseWithClientUpdatePayloadSchema.shape.client.shape.phone_number,
                )}
                isDisabled={isPending || isDeleting}
              />
              <TextField
                label="Address"
                value={clientAddress}
                onChange={setClientAddress}
                placeholder="Optional"
                isTextArea
                rows={3}
                validate={createFieldValidator(
                  CaseWithClientUpdatePayloadSchema.shape.client.shape.address,
                )}
                isDisabled={isPending || isDeleting}
              />
            </div>
            <div className={styles.divider} />
            <div className={styles.column}>
              <TextField
                label="Case Title"
                value={caseTitle}
                onChange={setCaseTitle}
                validate={createFieldValidator(
                  CaseWithClientUpdatePayloadSchema.shape.case.shape.case_title,
                )}
                isDisabled={isPending || isDeleting}
              />
              <TextField
                label="Case Type"
                value={caseType}
                onChange={setCaseType}
                placeholder="e.g. Civil, Corporate"
                validate={createFieldValidator(
                  CaseWithClientUpdatePayloadSchema.shape.case.shape.case_type,
                )}
                isDisabled={isPending || isDeleting}
              />
              <Select
                label="Status"
                value={status}
                onChange={selectEnumHandler(CaseStatus, setStatus)}
                isDisabled={isPending || isDeleting}
              >
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} id={s}>
                    {s}
                  </SelectItem>
                ))}
              </Select>
              <TextField
                label="Parties Involved"
                value={partiesInvolved}
                onChange={setPartiesInvolved}
                isTextArea
                rows={3}
                validate={createFieldValidator(
                  CaseWithClientUpdatePayloadSchema.shape.case.shape.parties_involved,
                )}
                isDisabled={isPending || isDeleting}
              />
            </div>
          </div>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              type="submit"
              isDisabled={isPending || isDeleting}
              isPending={isPending}
            >
              Save
            </Button>
            <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isPending || isDeleting}>
              {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
            </Button>
          </div>
        </Form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Case"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        This permanently deletes the case and ALL its tasks, milestones, notes, documents,
        assignments, and payments. This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
