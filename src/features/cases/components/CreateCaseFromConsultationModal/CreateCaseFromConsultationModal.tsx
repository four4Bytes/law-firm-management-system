"use client";

import { useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createCaseAction } from "@/features/cases/actions";
import { CaseCreatePayloadSchema } from "@/features/cases/schemas";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { CaseStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";

import styles from "./CreateCaseFromConsultationModal.module.css";

const STATUS_OPTIONS = Object.values(CaseStatus);

interface CreateCaseFromConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: (caseId: string) => void;
  onCancel?: () => Promise<boolean>;
  consultationId: string;
  clientId: string;
  defaultTitle: string;
  users: ActiveUserSummary[];
}

interface Fields {
  caseTitle: string;
  caseType: string;
  status: CaseStatus;
  partiesInvolved: string;
}

function resetFields(defaultTitle: string): Fields {
  return {
    caseTitle: defaultTitle,
    caseType: "",
    status: CaseStatus.Open,
    partiesInvolved: "",
  };
}

export function CreateCaseFromConsultationModal({
  isOpen,
  onOpenChange,
  onSuccess,
  onCancel,
  consultationId,
  clientId,
  defaultTitle,
  users,
}: CreateCaseFromConsultationModalProps) {
  const [fields, setFields] = useState<Fields>(() => resetFields(defaultTitle));
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);

  const { caseTitle, caseType, status, partiesInvolved } = fields;

  async function handleCancel() {
    if (isPending) return;
    setFields(resetFields(defaultTitle));
    setAssigneeIds(new Set());
    if (onCancel) {
      let reverted: boolean;
      try {
        reverted = await onCancel();
      } catch {
        toastError(
          "Failed to revert consultation status",
          "The consultation status could not be restored. Please review it before trying again.",
        );
        return;
      }
      if (!reverted) {
        toastError(
          "Failed to revert consultation status",
          "The consultation status could not be restored. Please review it before trying again.",
        );
        return;
      }
    }
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
      const result = await createCaseAction({
        client_id: clientId,
        case_title: requiredString(caseTitle),
        case_type: requiredString(caseType),
        status,
        parties_involved: optionalString(partiesInvolved),
        source_consultation_id: consultationId,
        assignee_ids: Array.from(assigneeIds),
      });

      if (result.success && result.data) {
        toastSuccess("Case created", "The case has been created.");
        setFields(resetFields(defaultTitle));
        setAssigneeIds(new Set());
        onOpenChange(false);
        onSuccess(result.data.id);
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
      <Form onSubmit={handleSubmit}>
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
          <Select
            label="Status"
            value={status}
            onChange={selectEnumHandler(CaseStatus, (value) => setField("status", value))}
            isDisabled={isPending}
          >
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} id={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
          <UserSelect
            users={users}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={isPending}
          />
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
