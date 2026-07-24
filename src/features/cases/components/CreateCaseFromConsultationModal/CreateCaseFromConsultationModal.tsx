"use client";

import { useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { createCaseAction } from "@/features/cases/actions";
import { AssigneeSelect } from "@/features/cases/components/AssigneeSelect/AssigneeSelect";
import { CaseCreatePayloadSchema } from "@/features/cases/schemas";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { CaseStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";

import styles from "./CreateCaseFromConsultationModal.module.css";

const STATUS_OPTIONS = Object.values(CaseStatus);

interface CreateCaseFromConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: (caseId: string) => void;
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
  consultationId,
  clientId,
  defaultTitle,
  users,
}: CreateCaseFromConsultationModalProps) {
  const [fields, setFields] = useState<Fields>(() => resetFields(defaultTitle));
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);

  const { caseTitle, caseType, status, partiesInvolved } = fields;

  function handleCancel() {
    if (isPending) return;
    setFields(resetFields(defaultTitle));
    setAssigneeIds(new Set());
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
        queue.add({ title: "Case created" }, { timeout: 5000 });
        setFields(resetFields(defaultTitle));
        setAssigneeIds(new Set());
        onOpenChange(false);
        onSuccess(result.data.caseId);
      } else {
        queue.add(
          { title: result.error ?? "Failed to create case. Please try again." },
          { timeout: 5000 },
        );
      }
    } catch {
      queue.add({ title: "Failed to create case. Please try again." }, { timeout: 5000 });
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
          <AssigneeSelect
            users={users}
            assigneeIds={assigneeIds}
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
