"use client";

import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createMilestoneAction } from "@/features/milestones/actions";
import { MilestoneCreatePayloadSchema } from "@/features/milestones/schemas";
import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./AddMilestoneModal.module.css";

const STATUS_OPTIONS = Object.values(CaseMilestoneStatus);

interface AddMilestoneModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId: string;
}

export function AddMilestoneModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
}: AddMilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [status, setStatus] = useState<CaseMilestoneStatus>(CaseMilestoneStatus.Pending);

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof MilestoneCreatePayloadSchema>
  >({
    submit: createMilestoneAction,
    onOpenChange,
    onSuccess,
    successMessage: "Milestone added",
    failureMessage: "Failed to add milestone",
    reset: () => {
      setTitle("");
      setDescription("");
      setDueDate(today(getLocalTimeZone()));
      setStatus(CaseMilestoneStatus.Pending);
    },
  });

  async function handleSubmit() {
    if (!title.trim()) return;

    await submitForm({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate.toDate(getLocalTimeZone()),
      status,
      case_id: caseId,
    });
  }

  return (
    <Modal
      title="Add Milestone"
      isOpen={isOpen}
      onOpenChange={handleCancel}
      className={styles.modal}
    >
      <div className={styles.content}>
        <TextField
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Milestone title"
          isDisabled={isPending}
        />
        <TextField
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Optional description"
          isTextArea
          rows={3}
          isDisabled={isPending}
        />
        <DateField
          label="Due Date"
          value={dueDate}
          onChange={(v) => v && setDueDate(v)}
          isDisabled={isPending}
        />
        <Select
          label="Status"
          value={status}
          onChange={(k) => setStatus(String(k) as CaseMilestoneStatus)}
          isDisabled={isPending}
        >
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} id={s}>
              {s}
            </SelectItem>
          ))}
        </Select>
        <div className={styles.actions}>
          <Button variant="secondary" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button onPress={handleSubmit} isDisabled={!title.trim() || isPending}>
            {isPending ? "Saving..." : "Save Milestone"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
