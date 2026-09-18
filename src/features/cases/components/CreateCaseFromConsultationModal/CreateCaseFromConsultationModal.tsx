"use client";

import { useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { CaseCreatePayloadSchema } from "@/features/cases/schemas";
import { acceptConsultationWithCaseAction } from "@/features/consultations/actions";
import { UserChips } from "@/features/users/components/UserChips/UserChips";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import type { ActiveUserSummary } from "@/features/users/queries";
import { CaseStatus } from "@/generated/prisma/browser";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";

import styles from "./CreateCaseFromConsultationModal.module.css";

interface CreateCaseFromConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: (caseId: string) => void;
  onCancel?: () => void;
  consultationId: string;
  defaultTitle: string;
  users: ActiveUserSummary[];
}

interface Fields {
  caseTitle: string;
  caseType: string;
  partiesInvolved: string;
}

function resetFields(defaultTitle: string): Fields {
  return {
    caseTitle: defaultTitle,
    caseType: "",
    partiesInvolved: "",
  };
}

export function CreateCaseFromConsultationModal({
  isOpen,
  onOpenChange,
  onSuccess,
  onCancel,
  consultationId,
  defaultTitle,
  users,
}: CreateCaseFromConsultationModalProps) {
  const [fields, setFields] = useState<Fields>(() => resetFields(defaultTitle));
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);

  const { caseTitle, caseType, partiesInvolved } = fields;

  function handleCancel() {
    if (isPending) return;
    setFields(resetFields(defaultTitle));
    setAssigneeIds(new Set());
    onCancel?.();
    onOpenChange(false);
  }

  function setField<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);

    try {
      const result = await acceptConsultationWithCaseAction({
        consultationId,
        case_title: requiredString(caseTitle),
        case_type: requiredString(caseType),
        status: CaseStatus.Open,
        parties_involved: optionalString(partiesInvolved),
        assignee_ids: Array.from(assigneeIds),
      });

      if (result.success && result.data) {
        toastSuccess("Case created", "The consultation has been accepted and the case created.");
        setFields(resetFields(defaultTitle));
        setAssigneeIds(new Set());
        onOpenChange(false);
        onSuccess(result.data.caseId);
      } else {
        toastActionError(result, "create case");
      }
    } catch {
      toastError("Failed to create case", "Something went wrong on our end. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      title="Create Case from Consultation"
      isOpen={isOpen}
      onOpenChange={handleCancel}
      className={styles.modal}
    >
      <Form validationBehavior="native" onSubmit={handleSubmit}>
        <div className={styles.column}>
          <TextField
            label="Case Title"
            value={caseTitle}
            onChange={(v) => setField("caseTitle", v)}
            placeholder="Case title"
            validate={createFieldValidator(CaseCreatePayloadSchema.shape.case_title)}
            isDisabled={isPending}
          />
          <TextField
            label="Case Type"
            value={caseType}
            onChange={(v) => setField("caseType", v)}
            placeholder="e.g. Civil, Corporate"
            validate={createFieldValidator(CaseCreatePayloadSchema.shape.case_type)}
            isDisabled={isPending}
          />
          <UserSelect
            users={users}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={isPending}
          />
          {assigneeIds.size > 0 && (
            <UserChips users={users.filter((user) => assigneeIds.has(user.id))} />
          )}
          <TextField
            label="Parties Involved"
            value={partiesInvolved}
            onChange={(v) => setField("partiesInvolved", v)}
            placeholder="Optional..."
            isTextArea
            rows={3}
            validate={createFieldValidator(CaseCreatePayloadSchema.shape.parties_involved)}
            isDisabled={isPending}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={isPending} isPending={isPending}>
            Create
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
