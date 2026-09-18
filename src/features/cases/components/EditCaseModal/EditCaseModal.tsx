"use client";

import { useMemo, useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { updateCaseWithClientAction } from "@/features/cases/actions";
import type { CaseEditData } from "@/features/cases/queries";
import { CaseWithClientUpdatePayloadSchema } from "@/features/cases/schemas";
import type { ClientEditData } from "@/features/clients/queries";
import { UserChips } from "@/features/users/components/UserChips/UserChips";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import type { ActiveUserSummary } from "@/features/users/queries";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditCaseModal.module.css";

interface EditCaseModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseData: CaseEditData;
  clientData: ClientEditData;
  users: ActiveUserSummary[];
}

export function EditCaseModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseData,
  clientData,
  users,
}: EditCaseModalProps) {
  const [clientId] = useState(caseData.client_id);
  const [clientName, setClientName] = useState(clientData.name);
  const [clientEmail, setClientEmail] = useState(clientData.email ?? "");
  const [clientPhone, setClientPhone] = useState(clientData.phone_number ?? "");
  const [clientAddress, setClientAddress] = useState(clientData.address ?? "");

  const [caseTitle, setCaseTitle] = useState(caseData.case_title);
  const [caseType, setCaseType] = useState(caseData.case_type);
  const [partiesInvolved, setPartiesInvolved] = useState(caseData.parties_involved ?? "");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(caseData.assignee_ids));

  const assigneeOptions = useMemo(() => {
    const directoryIds = new Set(users.map((user) => user.id));
    const missing = caseData.assignees.filter(
      (assignee) => assigneeIds.has(assignee.id) && !directoryIds.has(assignee.id),
    );
    return [...users, ...missing];
  }, [users, assigneeIds, caseData.assignees]);

  const { isPending, submitForm } = useModalForm<z.input<typeof CaseWithClientUpdatePayloadSchema>>(
    {
      submit: updateCaseWithClientAction,
      onOpenChange,
      onSuccess,
      successMessage: "Case updated",
      successDescription: "The case has been updated.",
      failureMessage: "Failed to update case. Please try again.",
      schema: CaseWithClientUpdatePayloadSchema,
    },
  );

  function handleDismiss() {
    if (isPending) return;
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
        phone_number: requiredString(clientPhone),
        address: optionalString(clientAddress),
      },
      case: {
        case_title: requiredString(caseTitle),
        case_type: requiredString(caseType),
        parties_involved: optionalString(partiesInvolved),
        assignee_ids: Array.from(assigneeIds),
      },
    });
  }

  return (
    <Modal title="Edit Case" isOpen={isOpen} onOpenChange={handleDismiss} className={styles.modal}>
      <Form validationBehavior="native" onSubmit={handleSave}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Client Name"
              value={clientName}
              onChange={setClientName}
              validate={createFieldValidator(
                CaseWithClientUpdatePayloadSchema.shape.client.shape.name,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="Optional"
              validate={createFieldValidator(
                CaseWithClientUpdatePayloadSchema.shape.client.shape.email,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Phone"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="Required"
              validate={createFieldValidator(
                CaseWithClientUpdatePayloadSchema.shape.client.shape.phone_number,
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
                CaseWithClientUpdatePayloadSchema.shape.client.shape.address,
              )}
              isDisabled={isPending}
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
              isDisabled={isPending}
            />
            <TextField
              label="Case Type"
              value={caseType}
              onChange={setCaseType}
              placeholder="e.g. Civil, Corporate"
              validate={createFieldValidator(
                CaseWithClientUpdatePayloadSchema.shape.case.shape.case_type,
              )}
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
            <TextField
              label="Parties Involved"
              value={partiesInvolved}
              onChange={setPartiesInvolved}
              isTextArea
              rows={3}
              validate={createFieldValidator(
                CaseWithClientUpdatePayloadSchema.shape.case.shape.parties_involved,
              )}
              isDisabled={isPending}
            />
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
