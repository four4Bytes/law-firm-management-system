"use client";

import { useMemo, useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { Separator } from "@/components/ui/Separator/Separator";
import { TextField } from "@/components/ui/TextField/TextField";
import { updateCaseWithClientAction } from "@/features/cases/actions";
import { CaseType } from "@/features/cases/constants";
import type { CaseEditData } from "@/features/cases/queries";
import { CaseWithClientUpdatePayloadSchema } from "@/features/cases/schemas";
import type { ClientEditData } from "@/features/clients/queries";
import { UserChips } from "@/features/users/components/UserChips/UserChips";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { mergeMissingUsers } from "@/features/users/display";
import type { UserSummary } from "@/features/users/types";
import { useModalForm } from "@/lib/hooks/useModalForm";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/validation/form-utils";

import styles from "./EditCaseModal.module.css";

interface EditCaseModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseData: CaseEditData;
  clientData: ClientEditData;
  users: UserSummary[];
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

  // Rows predating the category list keep their free-text value; show it as a
  // disabled option so the trigger is never blank, and make the schema force
  // a re-pick before saving.
  const selectedCaseType = Object.values(CaseType).find((type) => type === caseType);
  const isLegacyCaseType = selectedCaseType === undefined;

  const assigneeOptions = useMemo(
    () =>
      mergeMissingUsers({
        directory: users,
        selectedIds: assigneeIds,
        snapshot: caseData.assignees,
      }),
    [users, assigneeIds, caseData.assignees],
  );

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
    if (!selectedCaseType) return;

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
        case_type: selectedCaseType,
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
          <Separator orientation="vertical" className={styles.divider} />
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
            <Select
              label="Case Type"
              value={caseType}
              onChange={selectEnumHandler(CaseType, setCaseType)}
              placeholder="Select a case type"
              validate={createFieldValidator(
                CaseWithClientUpdatePayloadSchema.shape.case.shape.case_type,
              )}
              isDisabled={isPending}
            >
              {Object.values(CaseType).map((type) => (
                <SelectItem key={type} id={type}>
                  {type}
                </SelectItem>
              ))}
              {isLegacyCaseType && (
                <SelectItem id={caseType} isDisabled>
                  {caseType} (legacy - pick a category)
                </SelectItem>
              )}
            </Select>
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
