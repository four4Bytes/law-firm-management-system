"use client";

import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import {
  deleteMilestoneAction,
  getMilestoneRowByIdAction,
  updateMilestoneAction,
} from "@/features/milestones/actions";
import type { MilestoneRow } from "@/features/milestones/queries";
import { MilestoneUpdatePayloadSchema } from "@/features/milestones/schemas";
import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { toCalendarDate } from "@/lib/date";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditMilestoneModal.module.css";

const STATUS_OPTIONS = Object.values(CaseMilestoneStatus);

interface EditMilestoneModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  milestoneId: string | null;
}

export function EditMilestoneModal({
  isOpen,
  onOpenChange,
  onSuccess,
  milestoneId,
}: EditMilestoneModalProps) {
  const [milestone, setMilestone] = useState<MilestoneRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [status, setStatus] = useState<CaseMilestoneStatus>(CaseMilestoneStatus.Pending);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<z.input<typeof MilestoneUpdatePayloadSchema>>({
    submit: updateMilestoneAction,
    onOpenChange,
    onSuccess,
    successMessage: "Milestone updated",
    failureMessage: "Failed to update milestone",
  });

  useEffect(() => {
    if (!isOpen || !milestoneId) return;

    const id = milestoneId;
    let cancelled = false;

    async function load() {
      try {
        const data = await getMilestoneRowByIdAction(id);
        if (cancelled) return;
        if (data) {
          setMilestone(data);
          setTitle(data.title);
          setDescription(data.description ?? "");
          setDueDate(toCalendarDate(data.due_date));
          setStatus(data.status as CaseMilestoneStatus);
        } else {
          setMilestone(null);
        }
      } catch {
        if (cancelled) return;
        setMilestone(null);
        queue.add({ title: "Failed to load milestone" }, { timeout: 5000 });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, milestoneId]);

  async function handleSave() {
    if (!title.trim() || !milestoneId) return;

    const date = dueDate.toDate(getLocalTimeZone());

    await submitForm({
      milestoneId,
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: date,
      status,
    });
  }

  async function handleDelete() {
    if (!milestoneId) return;
    setIsDeleting(true);

    const result = await deleteMilestoneAction({ milestoneId });

    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (result.success) {
      queue.add({ title: "Milestone deleted" }, { timeout: 5000 });
      onOpenChange(false);
      onSuccess();
    } else {
      queue.add({ title: result.error ?? "Failed to delete milestone" }, { timeout: 5000 });
    }
  }

  const isLoadingData = isOpen && milestone == null;
  const hasChanges =
    title.trim() !== (milestone?.title ?? "") ||
    description.trim() !== (milestone?.description ?? "") ||
    dueDate.compare(toCalendarDate(milestone?.due_date ?? new Date())) !== 0 ||
    status !== (milestone?.status ?? "Pending");

  const isValid = title.trim().length > 0;

  if (isLoadingData) {
    return (
      <Modal
        title="Edit Milestone"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading milestone" />
        </div>
      </Modal>
    );
  }

  if (!milestone) {
    return (
      <Modal
        title="Edit Milestone"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <span>Milestone not found.</span>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        title="Edit Milestone"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className={styles.modal}
      >
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Milestone title"
            isDisabled={isPending || isDeleting}
          />
          <TextField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            isTextArea
            rows={3}
            isDisabled={isPending || isDeleting}
          />
          <DateField
            label="Due Date"
            value={dueDate}
            onChange={(v) => v && setDueDate(v)}
            isDisabled={isPending || isDeleting}
          />
          <Select
            label="Status"
            value={status}
            onChange={(k) => setStatus(String(k) as CaseMilestoneStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} id={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onPress={handleSave}
              isDisabled={!isValid || (!hasChanges && !isPending) || isPending || isDeleting}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isPending || isDeleting}>
              {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Milestone"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this milestone? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
