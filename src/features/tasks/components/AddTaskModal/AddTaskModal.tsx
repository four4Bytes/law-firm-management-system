"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { Separator } from "@/components/ui/Separator/Separator";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { UploadQueue } from "@/features/documents/components/UploadQueue/UploadQueue";
import { addTaskReviewerAction, createTaskAction } from "@/features/tasks/actions";
import { AssigneeReviewerPicker } from "@/features/tasks/components/AssigneeReviewerPicker/AssigneeReviewerPicker";
import { TaskCreatePayloadSchema } from "@/features/tasks/schemas";
import type { UserSummary } from "@/features/users/types";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/files/file-types";
import { toastActionError, toastError, toastInfo, toastSuccess } from "@/lib/hooks/toast-utils";
import { useFileUpload } from "@/lib/hooks/useFileUpload";
import { combineDateTime, isBeforeToday } from "@/lib/primitives/date";
import {
  createFieldValidator,
  firstIssueMessage,
  optionalString,
  requiredString,
} from "@/lib/validation/form-utils";

import styles from "./AddTaskModal.module.css";

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId: string;
  users: UserSummary[];
  currentUserId: string | null;
  isLoading?: boolean;
}

function defaultReviewerIds(currentUserId: string | null): Set<string> {
  return currentUserId ? new Set([currentUserId]) : new Set<string>();
}

export function AddTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  users,
  currentUserId,
  isLoading = false,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<CalendarDate | null>(null);
  const [dueTime, setDueTime] = useState<Time>(new Time(9, 0));
  // Safe to seed at init: `currentUserId` arrives as a server prop on first
  // render, so there is no window where it is still null.
  const [reviewerIds, setReviewerIds] = useState<Set<string>>(() =>
    defaultReviewerIds(currentUserId),
  );
  const [isPending, setIsPending] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [addedReviewerIds, setAddedReviewerIds] = useState<Set<string>>(new Set());

  const { fileEntries, hasFiles, addFiles, removeFile, resetFiles, setParent, uploadFiles } =
    useFileUpload({ caseId });

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssigneeIds(new Set());
    setDueDate(null);
    setDueTime(new Time(9, 0));
    setReviewerIds(defaultReviewerIds(currentUserId));
    setCreatedTaskId(null);
    setAddedReviewerIds(new Set());
    resetFiles();
  }

  function handleCancel() {
    if (isPending) return;
    resetForm();
    onOpenChange(false);
  }

  function validateDueDate(): string | null {
    if (dueDate !== null && isBeforeToday(combineDateTime(dueDate, dueTime))) {
      return "Due date cannot be in the past";
    }
    return null;
  }

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending || isLoading || !currentUserId) return;

    const parsed = TaskCreatePayloadSchema.safeParse({
      title: requiredString(title),
      description: optionalString(description),
      due_date: dueDate ? combineDateTime(dueDate, dueTime) : undefined,
      case_id: caseId,
      assignee_ids: Array.from(assigneeIds),
    });

    if (!parsed.success) {
      toastError(
        "Failed to create task",
        firstIssueMessage(parsed.error, "Please review the highlighted form fields and try again."),
      );
      return;
    }

    setIsPending(true);

    try {
      let taskId = createdTaskId;

      if (!taskId) {
        const result = await createTaskAction(parsed.data);

        if (!result.success || !result.data) {
          toastActionError(result, "create task");
          setIsPending(false);
          return;
        }

        setCreatedTaskId(result.data.id);
        taskId = result.data.id;
      }

      if (reviewerIds.size > 0) {
        let reviewerFailed = false;
        for (const id of reviewerIds) {
          if (id === currentUserId || addedReviewerIds.has(id)) continue;
          const result = await addTaskReviewerAction({ taskId, reviewerUserId: id });
          if (!result.success) {
            reviewerFailed = true;
            toastActionError(result, "add reviewer");
            continue;
          }
          setAddedReviewerIds((prev) => new Set(prev).add(id));
        }
        if (reviewerFailed) {
          setIsPending(false);
          return;
        }
      }

      if (hasFiles) {
        setParent({ taskId });
        const { uploaded, failed } = await uploadFiles();
        if (failed > 0) {
          toastInfo(
            "Task created, but some files failed to upload",
            "The task was created, but some attachments did not upload. Try adding them again.",
          );
          return;
        }
        if (uploaded > 0) {
          toastSuccess(
            `Task created with ${uploaded} file${uploaded > 1 ? "s" : ""}`,
            "The task and its attachments have been added.",
          );
        }
      } else {
        toastSuccess("Task created", "The task has been created.");
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      toastError(
        "Unexpected error",
        "Something went wrong while creating the task. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal title="Add Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSubmit} validationBehavior="native" className={styles.form}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Enter task title..."
              validate={createFieldValidator(TaskCreatePayloadSchema.shape.title)}
              isDisabled={isPending || isLoading}
            />
            <TextField
              label="Description"
              isTextArea
              rows={3}
              value={description}
              onChange={setDescription}
              placeholder="Optional description..."
              validate={createFieldValidator(TaskCreatePayloadSchema.shape.description)}
              isDisabled={isPending || isLoading}
            />
            <AssigneeReviewerPicker
              users={users}
              assigneeIds={assigneeIds}
              onAssigneeIdsChange={setAssigneeIds}
              reviewerIds={reviewerIds}
              onReviewerIdsChange={setReviewerIds}
              creatorUserId={currentUserId ?? ""}
              isAssigneeDisabled={isPending || isLoading}
              isReviewerDisabled={isPending || isLoading}
              isAssigneeLoading={isLoading}
              isReviewerLoading={isLoading}
              validate={createFieldValidator(TaskCreatePayloadSchema.shape.assignee_ids)}
            />
            <DatePicker
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              isDisabled={isPending || isLoading}
              validate={validateDueDate}
            />
            <TimeField
              label="Due Time"
              value={dueTime}
              onChange={(v) => v && setDueTime(new Time(v.hour, v.minute))}
              isDisabled={isPending || isLoading}
            />
          </div>

          <Separator orientation="vertical" className={styles.divider} />

          <div className={styles.column}>
            <DropZone
              allowsMultiple
              onFileSelect={addFiles}
              acceptedFileTypes={ACCEPTED_FILE_EXTENSIONS}
              isDisabled={isPending || isLoading}
              label="Drop files or click to upload"
              description="Supported: PDF, DOC, XLS, images, TXT, CSV"
            />
            <UploadQueue entries={fileEntries} isBusy={isPending} onRemove={removeFile} />
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            isDisabled={isPending || isLoading || !currentUserId}
            isPending={isPending}
          >
            Create Task
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
